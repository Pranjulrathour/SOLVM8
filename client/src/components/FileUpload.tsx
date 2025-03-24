import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getFileTypeName, isValidFileType, formatFileSize } from '@/utils/fileProcessing';

interface FileUploadProps {
  onFileUploaded: (fileUrl: string, text: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const resetFileState = () => {
    setFileName(null);
    setFileSize(null);
    setFileType(null);
    setUploadStatus('idle');
    setErrorMessage(null);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    resetFileState();
    
    // Store file metadata
    setFileName(file.name);
    setFileSize(file.size);
    setFileType(file.type);
    
    // Validate file type
    const allowedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus('error');
      setErrorMessage(`Unsupported file type: ${getFileTypeName(file.type)}. Please upload a PDF, DOCX, Excel, or an image file.`);
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, Excel, or an image file.",
        variant: "destructive"
      });
      return;
    }
    
    setUploading(true);
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      // Simulate realistic progress with acceleration at the beginning and slowing at the end
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 30) {
            return prev + Math.random() * 15; // Faster at start
          } else if (prev < 70) {
            return prev + Math.random() * 10; // Medium speed
          } else if (prev < 90) {
            return prev + Math.random() * 5; // Slower near end
          }
          return prev; // Hold at 90% until actual completion
        });
      }, 300);
      
      // Upload the file to server
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload file');
      }
      
      setUploadProgress(100);
      setUploadStatus('success');
      
      const data = await response.json();
      onFileUploaded(data.fileUrl, data.extractedText);
      
      toast({
        title: "File uploaded successfully",
        description: "Your assignment is ready for processing",
        variant: "default",
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      const errorMsg = error instanceof Error ? error.message : "Something went wrong during upload";
      setErrorMessage(errorMsg);
      
      toast({
        title: "Upload failed",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset progress after 2 seconds if successful, keep if error
      if (uploadStatus !== 'error') {
        setTimeout(() => setUploadProgress(0), 2000);
      }
    }
  }, [onFileUploaded, toast, uploadStatus]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    disabled: uploading,
    maxFiles: 1,
    multiple: false,
  });
  
  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Upload Assignment</h3>
        {fileName && (
          <button
            onClick={resetFileState}
            className="text-sm text-accent-purple hover:underline transition-all-smooth"
            disabled={uploading}
          >
            Reset
          </button>
        )}
      </div>
      
      {!fileName ? (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all-smooth ${
            isDragActive 
              ? 'border-accent-purple bg-accent-purple/5' 
              : 'border-gray-300 hover:border-accent-purple hover:bg-accent-purple/5'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-2">
            Drag and drop your file here, or <span className="text-accent-purple font-medium">browse</span>
          </p>
          <p className="text-sm text-gray-500">Supports PDF, DOCX, Excel, and images (JPEG, PNG)</p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-start">
            <FileText className="h-10 w-10 text-accent-purple shrink-0 mr-3" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{fileName}</p>
              <p className="text-sm text-gray-500">
                {fileType && getFileTypeName(fileType)} · {fileSize && formatFileSize(fileSize)}
              </p>
            </div>
            {uploadStatus === 'success' && <CheckCircle2 className="h-5 w-5 text-primary-green" />}
            {uploadStatus === 'error' && <AlertCircle className="h-5 w-5 text-destructive-red" />}
          </div>
          
          {uploadStatus === 'error' && errorMessage && (
            <div className="error-message mt-3 text-sm">
              <AlertCircle className="h-4 w-4 inline-block mr-1" />
              {errorMessage}
            </div>
          )}
          
          {uploadStatus === 'success' && (
            <div className="success-message mt-3 text-sm">
              <CheckCircle2 className="h-4 w-4 inline-block mr-1" />
              File processed successfully. Ready to generate solution.
            </div>
          )}
        </div>
      )}
      
      {(uploading || uploadProgress > 0) && (
        <div className="mt-4 animate-slide-up">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{uploading ? "Uploading file..." : "Upload complete"}</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
