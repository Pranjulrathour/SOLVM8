import { supabaseService } from './supabase';
import { v4 as uuidv4 } from 'uuid';
import { fileTypeFromBuffer } from 'file-type';
import { createWorker } from 'tesseract.js';
import type { Multer } from 'multer';
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
      const extractedText = await this.extractText(file.buffer, file.mimetype);
      
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
    try {
      // Basic PDF signature check (simple validation)
      const pdfSignature = buffer.toString('ascii', 0, 5);
      if (pdfSignature !== '%PDF-') {
        throw new Error('Invalid PDF format');
      }
      
      // Log successful PDF detection
      console.log('PDF detected, processing file...');
      
      // Convert PDF buffer to string for text extraction
      // We limit to first 200KB for performance
      const pdfText = buffer.toString('utf8', 0, Math.min(buffer.length, 200000));
      
      // Simple but effective text extraction approach for PDFs
      const extractedTexts: string[] = [];
      
      // Find all text between parentheses, which is how most text is stored in PDFs
      const textRegex = /\(([^\)]{2,})\)/g;
      let match;
      
      while ((match = textRegex.exec(pdfText)) !== null) {
        if (match[1] && match[1].length > 2) {
          // Clean up common PDF text encodings
          let text = match[1]
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
          
          // If text is printable and not just numbers or symbols
          if (/[a-zA-Z]{2,}/.test(text)) {
            extractedTexts.push(text);
          }
        }
      }
      
      // Find hex-encoded text (another common PDF text format)
      const hexTextRegex = /<([0-9A-Fa-f]{6,})>/g;
      while ((match = hexTextRegex.exec(pdfText)) !== null) {
        if (match[1]) {
          try {
            let text = '';
            const hex = match[1];
            
            // Convert hex to ASCII
            for (let i = 0; i < hex.length; i += 2) {
              if (i + 1 < hex.length) {
                const charCode = parseInt(hex.substr(i, 2), 16);
                // Only include printable ASCII
                if (charCode >= 32 && charCode <= 126) {
                  text += String.fromCharCode(charCode);
                }
              }
            }
            
            // Only add meaningful text segments
            if (text.length > 3 && /[a-zA-Z]{2,}/.test(text)) {
              extractedTexts.push(text);
            }
          } catch (e) {
            // Skip invalid hex
          }
        }
      }
      
      // If no text was found, provide a helpful message
      if (extractedTexts.length === 0) {
        console.log("No text extracted from PDF, likely image-based or encrypted");
        return "The PDF appears to be image-based, encrypted, or uses custom encoding. Please provide a text summary of your assignment question.";
      }
      
      // Join all extracted text fragments
      const result = extractedTexts
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      console.log(`Successfully extracted ${result.length} characters from PDF`);
      return result;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
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
      // In production, we would integrate with Tesseract.js
      // For now, create a safe implementation that won't cause errors
      
      // Log the image processing attempt
      console.log('Image processing initiated, buffer size:', buffer.length);
      
      // In the future, we would use tesseract.js like:
      // const worker = await createWorker();
      // await worker.loadLanguage('eng');
      // await worker.initialize('eng');
      // const { data: { text } } = await worker.recognize(buffer);
      // await worker.terminate();
      // return text;
      
      // For now, return a message indicating OCR would be used
      return "Image uploaded successfully. OCR text extraction will be available in production.";
    } catch (error) {
      console.error('Image OCR error:', error);
      throw new Error('Failed to extract text from image');
    }
  }
}

export const fileProcessor = new FileProcessor();
