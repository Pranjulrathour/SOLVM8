/**
 * Utility functions for file processing
 */

/**
 * Validates if a file is of an allowed type
 * @param file File to validate
 * @returns Boolean indicating if file type is valid
 */
export const isValidFileType = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];
  
  return allowedTypes.includes(file.type);
};

/**
 * Gets a readable file type name
 * @param mimeType The MIME type of the file
 * @returns Human-readable file type name
 */
export const getFileTypeName = (mimeType: string): string => {
  const mimeToNameMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
  };
  
  return mimeToNameMap[mimeType] || 'Unknown File Type';
};

/**
 * Estimates the processing time based on file size
 * @param fileSizeBytes Size of the file in bytes
 * @returns Estimated processing time in seconds
 */
export const estimateProcessingTime = (fileSizeBytes: number): number => {
  // Base processing time is 5 seconds
  const baseTime = 5;
  
  // Add additional time based on file size (1 second per MB, roughly)
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  const sizeBasedTime = fileSizeMB * 1;
  
  return Math.max(baseTime, Math.min(60, baseTime + sizeBasedTime));
};

/**
 * Formats file size for display
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
};
