import { useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SolutionDisplayProps {
  solution: string | null;
  question: string;
  fileUrl: string | null;
  attemptCount: number;
  maxAttempts: number;
  onRefine: () => void;
}

const SolutionDisplay: React.FC<SolutionDisplayProps> = ({
  solution,
  question,
  fileUrl,
  attemptCount,
  maxAttempts,
  onRefine
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const generatePdf = async () => {
    if (!solution || !fileUrl) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/generate-pdf', {
        solution,
        question,
        fileUrl
      });
      
      const data = await response.json();
      setDownloadUrl(data.pdfUrl);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = data.pdfUrl;
      link.download = 'solution.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "PDF Generated",
        description: "Your solution has been exported to PDF",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show placeholder if no solution is available
  if (!solution) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
        <div className="text-center py-6">
          <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Solution Yet</h3>
          <p className="text-gray-600">Upload an assignment to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Solution</h3>
        <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Attempt: <span className="font-medium">{attemptCount}/{maxAttempts}</span>
        </div>
      </div>
      
      {question && (
        <div className="p-3 bg-gray-50 rounded-lg mb-4">
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Question:</p>
            <p>{question}</p>
          </div>
        </div>
      )}
      
      <div className="p-3 bg-primaryGreen bg-opacity-5 border border-primaryGreen border-opacity-20 rounded-lg mb-4">
        <div className="text-sm text-gray-800">
          <p className="font-medium mb-1 text-primaryGreen">Solution:</p>
          <div className="whitespace-pre-line">{solution}</div>
        </div>
      </div>
      
      <div className="flex space-x-3">
        <Button 
          className="flex-1 bg-accentBluePurple hover:bg-accentBluePurple/90 text-white"
          onClick={generatePdf}
          disabled={isLoading}
        >
          <Download className="h-5 w-5 mr-2" />
          Download PDF
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 border-accentBluePurple text-accentBluePurple hover:bg-accentBluePurple/10"
          onClick={onRefine}
          disabled={attemptCount >= maxAttempts || isLoading}
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Refine
        </Button>
      </div>
    </div>
  );
};

export default SolutionDisplay;
