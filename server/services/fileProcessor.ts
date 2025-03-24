import { supabaseService } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';
import { createWorker } from 'tesseract.js';
import type { Multer } from 'multer';
// Import pdf.js-extract for PDF extraction
import { PDFExtract } from 'pdf.js-extract';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
// Import docx-parser
import * as docxParser from 'docx-parser';

// DOCX parser using actual docx-parser library
const docx = { 
  parseDocx: (buffer: Buffer, callback: (err: Error | null, data: string) => void) => {
    try {
      docxParser.parseDocx(buffer, (err: Error | null, output: string) => {
        if (err) {
          console.error('DOCX parsing error:', err);
          callback(new Error('Failed to parse DOCX file'), '');
        } else {
          callback(null, output);
        }
      });
    } catch (err) {
      console.error('DOCX parsing unexpected error:', err);
      callback(err instanceof Error ? err : new Error('Docx parsing error'), '');
    }
  }
};

// Import xlsx library
import * as XLSX from 'xlsx';

// Promised versions of fs functions
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Create an instance of PDF extractor
const pdfExtract = new PDFExtract();

interface ProcessedFile {
  fileUrl: string;
  extractedText: string;
}

class FileProcessor {
  /**
   * Process an uploaded file
   * @param file File object from multer
   * @returns Object with file URL and extracted text
   */
  async processFile(file: any): Promise<ProcessedFile> {
    try {
      // Generate unique file name
      const fileExtension = file.originalname.split('.').pop() || '';
      const fileName = `${uuidv4()}.${fileExtension}`;
      const filePath = `assignments/${fileName}`;
      
      // Upload file to storage
      const fileUrl = await supabaseService.uploadFile(file.buffer, 'assignments', filePath);
      
      // Extract text from file based on its type
      let extractedText = await this.extractText(file.buffer, file.mimetype);
      
      // Format the extracted text for better readability
      extractedText = this.formatExtractedText(extractedText);
      
      return {
        fileUrl,
        extractedText
      };
    } catch (error) {
      console.error('File processing error:', error);
      throw new Error('Failed to process file');
    }
  }
  
  /**
   * Extract text from a file based on its MIME type
   * @param buffer File buffer
   * @param mimeType MIME type of the file
   * @returns Extracted text
   */
  private async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractFromPdf(buffer);
          
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractFromDocx(buffer);
          
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          return await this.extractFromExcel(buffer);
          
        case 'image/jpeg':
        case 'image/png':
          return await this.extractFromImage(buffer);
          
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      throw new Error('Failed to extract text from file');
    }
  }
  
  /**
   * Extract text from a PDF file
   * @param buffer PDF file buffer
   * @returns Extracted text
   */
  private async extractFromPdf(buffer: Buffer): Promise<string> {
    let tempFilePath = '';
    
    try {
      // Log successful PDF detection
      console.log('PDF detected, processing file...');
      
      // Create a temporary file to save the PDF
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `${uuidv4()}.pdf`);
      
      // Write buffer to temporary file
      await writeFileAsync(tempFilePath, buffer);
      
      // Use pdf.js-extract to extract text
      const data = await pdfExtract.extract(tempFilePath, {});
      
      // Process extracted data
      let extractedText = '';
      if (data && data.pages) {
        // Combine text from all pages
        for (const page of data.pages) {
          const pageContent = page.content || [];
          // Extract text from each content item
          for (const item of pageContent) {
            if (item.str) {
              extractedText += item.str + ' ';
            }
          }
          extractedText += '\n';
        }
      }
      
      // Clean up the extracted text
      extractedText = extractedText
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // If no meaningful text was extracted
      if (!extractedText || extractedText.trim().length < 10) {
        console.log("Minimal text extracted from PDF, likely image-based");
        
        // Try OCR as fallback for image-based PDFs
        try {
          console.log('Attempting OCR for image-based PDF...');
          return await this.extractFromImage(buffer);
        } catch (ocrError) {
          console.error('OCR fallback failed:', ocrError);
          return "The PDF appears to be image-based. Please provide a text version or summary of your assignment question.";
        }
      }
      
      console.log(`Successfully extracted ${extractedText.length} characters from PDF`);
      return extractedText;
    } catch (error) {
      console.error('PDF extraction error:', error);
      
      // Fallback to OCR if pdf-extract fails
      try {
        console.log('Attempting OCR fallback for PDF...');
        return await this.extractFromImage(buffer);
      } catch (fallbackError) {
        console.error('All PDF extraction methods failed:', fallbackError);
        throw new Error('Failed to extract text from PDF');
      }
    } finally {
      // Clean up temporary file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          await unlinkAsync(tempFilePath);
        } catch (cleanupError) {
          console.error('Error cleaning up temporary PDF file:', cleanupError);
        }
      }
    }
  }
  
  /**
   * Extract text from a DOCX file
   * @param buffer DOCX file buffer
   * @returns Extracted text
   */
  private async extractFromDocx(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        docx.parseDocx(buffer, (err: Error | null, output: string) => {
          if (err) {
            reject(new Error('Failed to extract text from DOCX'));
          } else {
            resolve(output.trim());
          }
        });
      } catch (error) {
        console.error('DOCX extraction error:', error);
        reject(new Error('Failed to extract text from DOCX'));
      }
    });
  }
  
  /**
   * Extract text from an Excel file
   * @param buffer Excel file buffer
   * @returns Extracted text
   */
  private async extractFromExcel(buffer: Buffer): Promise<string> {
    try {
      // Use the actual XLSX library to read the Excel file
      const workbook = XLSX.read(buffer);
      
      let result = '';
      
      // Process each sheet in the workbook
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        // Convert sheet to JSON data
        const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (sheetData.length > 0) {
          result += `Sheet: ${sheetName}\n`;
          
          // Convert each row to a tab-separated string
          sheetData.forEach((row: any) => {
            if (Array.isArray(row) && row.length > 0) {
              result += row.join('\t') + '\n';
            }
          });
          
          result += '\n';
        }
      });
      
      return result.trim();
    } catch (error) {
      console.error('Excel extraction error:', error);
      throw new Error('Failed to extract text from Excel');
    }
  }
  
  /**
   * Extract text from an image using OCR
   * @param buffer Image file buffer
   * @returns Extracted text
   */
  private async extractFromImage(buffer: Buffer): Promise<string> {
    try {
      console.log('Starting OCR text extraction...');
      
      // Create a temporary file for the image (Tesseract works better with files)
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `${uuidv4()}.png`);
      
      // Write buffer to temporary file
      await writeFileAsync(tempFilePath, buffer);
      
      // Create a worker with English language
      const worker = await createWorker();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Log progress
      worker.setLogger(m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.floor(m.progress * 100)}%`);
        }
      });
      
      // Extract text from image
      const { data } = await worker.recognize(tempFilePath);
      
      // Cleanup
      await worker.terminate();
      if (fs.existsSync(tempFilePath)) {
        await unlinkAsync(tempFilePath);
      }
      
      // Check if text was successfully extracted
      if (!data.text || data.text.trim().length === 0) {
        console.log('OCR completed but no text was extracted');
        return "No text could be extracted from the image. Please provide a clearer image or manually enter the text.";
      }
      
      console.log(`OCR completed successfully. Extracted ${data.text.length} characters.`);
      return data.text;
    } catch (error) {
      console.error('Image OCR error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Format extracted text to improve readability and organize content
   * @param text Raw extracted text
   * @returns Formatted text
   */
  private formatExtractedText(text: string): string {
    if (!text || text.trim().length === 0) {
      return text;
    }
    
    try {
      console.log('Formatting extracted text...');
      
      // Replace multiple spaces with single space
      let formatted = text.replace(/\s+/g, ' ').trim();
      
      // Split text into lines and paragraphs
      formatted = this.detectAndFormatParagraphs(formatted);
      
      // Detect and format questions
      formatted = this.detectAndFormatQuestions(formatted);
      
      // Format mathematical content
      formatted = this.formatMathematicalContent(formatted);
      
      // Format tabular data
      formatted = this.formatTabularData(formatted);
      
      // Group related questions
      formatted = this.groupRelatedQuestions(formatted);
      
      // Add a header
      formatted = "### Extracted Assignment Content:\n\n" + formatted;
      
      // Add a footer note
      formatted += "\n\n---\n*Please review the extracted content and make any necessary corrections.*";
      
      console.log('Text formatting completed');
      return formatted;
    } catch (error) {
      console.error('Error formatting text:', error);
      // Return original text if formatting fails
      return text;
    }
  }
  
  /**
   * Detect and format paragraphs in text
   * @param text Raw text
   * @returns Text with properly formatted paragraphs
   */
  private detectAndFormatParagraphs(text: string): string {
    // Split on common sentence endings followed by capital letters (likely paragraph breaks)
    const sentenceEndingPattern = /([.!?])\s+([A-Z])/g;
    let formatted = text.replace(sentenceEndingPattern, '$1\n\n$2');
    
    // Ensure consistent newlines
    formatted = formatted.replace(/\r\n/g, '\n');
    
    // Replace triple or more newlines with double newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted;
  }
  
  /**
   * Detect and format questions in text
   * @param text Raw text
   * @returns Text with properly formatted questions
   */
  private detectAndFormatQuestions(text: string): string {
    // Common question starters and patterns
    const questionPatterns = [
      // Question numbers with different formats (1., 1), Q1., Question 1, etc.)
      /(\n|^)([0-9]+[\.\)]\s*)/g,
      /(\n|^)(Q[0-9]+[\.\)]\s*)/g,
      /(\n|^)(Question\s+[0-9]+[\.\):\s]*)/gi,
      
      // Multiple choice options
      /(\n|^)([A-D][\.\)]\s*)/g,
      /(\n|^)(\([A-D]\)\s*)/g,
      
      // Questions with question marks
      /([^.!?]\s*)(\?)\s+([A-Z])/g
    ];
    
    let formatted = text;
    
    // Apply formatting for each pattern
    questionPatterns.forEach(pattern => {
      if (pattern.toString().includes('?')) {
        // Special handling for question marks to add paragraph breaks
        formatted = formatted.replace(pattern, '$1$2\n\n$3');
      } else {
        // For numbered questions and options, add newlines before them
        formatted = formatted.replace(pattern, '\n\n$1$2');
      }
    });
    
    // Format true/false and yes/no options
    const optionPatterns = [
      /(\b)(True|False)(\b)/gi,
      /(\b)(Yes|No)(\b)/gi
    ];
    
    optionPatterns.forEach(pattern => {
      formatted = formatted.replace(pattern, '\n• $2');
    });
    
    // Clean up extra whitespace
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    return formatted;
  }
  
  /**
   * Format mathematical content in the text
   * @param text Extracted text
   * @returns Text with formatted math expressions
   */
  private formatMathematicalContent(text: string): string {
    // Mathematical operators and symbols to format
    const mathPatterns = [
      // Equations with equals sign
      /(\w+\s*=\s*[\w\d\+\-\*\/\^\(\)]+)/g,
      
      // Fractions
      /(\d+\/\d+)/g,
      
      // Exponents
      /(\w+\^[\d\w]+)/g,
      
      // Math formulas
      /([\w\d]+\s*[\+\-\*\/]\s*[\w\d\+\-\*\/\^\(\)]+)/g
    ];
    
    let formatted = text;
    
    // Wrap math expressions in code blocks
    mathPatterns.forEach(pattern => {
      formatted = formatted.replace(pattern, (match) => {
        // Don't format if already inside code blocks
        if (match.includes('`')) return match;
        return '`' + match + '`';
      });
    });
    
    return formatted;
  }
  
  /**
   * Format tabular data in the text
   * @param text Extracted text
   * @returns Text with formatted tables
   */
  private formatTabularData(text: string): string {
    // Look for potential tabular data (lines with multiple spaces or tabs)
    const lines = text.split('\n');
    let formatted = '';
    let inTable = false;
    let tableLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Detect potential table rows (lines with multiple tab-like separations)
      const isTableRow = (line.includes('\t') || (line.match(/\s{2,}/g)?.length || 0) > 2) && line.trim().length > 0;
      
      if (isTableRow) {
        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(line);
      } else {
        if (inTable && tableLines.length > 0) {
          // Process and format table
          formatted += this.formatTableLines(tableLines) + '\n\n';
          inTable = false;
          tableLines = [];
        }
        formatted += line + '\n';
      }
    }
    
    // Handle any remaining table at the end of text
    if (inTable && tableLines.length > 0) {
      formatted += this.formatTableLines(tableLines) + '\n\n';
    }
    
    return formatted;
  }
  
  /**
   * Format a group of lines as a table
   * @param lines Lines that appear to be a table
   * @returns Markdown formatted table
   */
  private formatTableLines(lines: string[]): string {
    // Simple formatting to preserve tabular data
    let result = '```\n';
    lines.forEach(line => {
      // Replace multiple spaces with evenly spaced columns
      const cleanLine = line.replace(/\s{2,}/g, '  ');
      result += cleanLine + '\n';
    });
    result += '```';
    return result;
  }
  
  /**
   * Group related questions together
   * @param text Formatted text
   * @returns Text with grouped questions
   */
  private groupRelatedQuestions(text: string): string {
    const lines = text.split('\n');
    let formatted = '';
    let currentGroup = '';
    
    // Common question section headers
    const sectionHeaderPatterns = [
      /^Section\s+\d+/i,
      /^Part\s+[A-Z\d]+/i,
      /^Exercise\s+\d+/i,
      /^Problem\s+\d+/i
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line is a section header
      const isSectionHeader = sectionHeaderPatterns.some(pattern => pattern.test(line));
      
      if (isSectionHeader) {
        // End previous group if exists
        if (currentGroup) {
          formatted += currentGroup + '\n\n';
          currentGroup = '';
        }
        
        // Start new group with header
        currentGroup = '## ' + line + '\n';
      } else if (line.match(/^\d+[\.\)]/)) {
        // This is a numbered question
        if (currentGroup && !currentGroup.includes('## ')) {
          // If we have content but no section header, add one
          formatted += '## Questions\n' + currentGroup + '\n\n';
          currentGroup = '';
        }
        
        // Add question with proper formatting
        currentGroup += '\n### ' + line + '\n';
      } else if (line) {
        // Regular content line
        currentGroup += line + '\n';
      } else if (line === '') {
        // Empty line - keep one
        currentGroup += '\n';
      }
    }
    
    // Add any remaining group
    if (currentGroup) {
      formatted += currentGroup;
    }
    
    return formatted;
  }
}

export const fileProcessor = new FileProcessor();
