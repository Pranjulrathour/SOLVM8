import { useState } from 'react';
import { Download, RefreshCw, FileText, Share, Copy, Check, FileDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SolutionDisplayProps {
  solution: string | null;
  question: string;
  fileUrl: string | null;
  attemptCount: number;
  maxAttempts: number;
  onRefine: () => void;
  extractedText?: string; // Add extracted text
}

const SolutionDisplay: React.FC<SolutionDisplayProps> = ({
  solution,
  question,
  fileUrl,
  attemptCount,
  maxAttempts,
  onRefine,
  extractedText
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generatePdf = async () => {
    if (!solution || !fileUrl) return;
    
    setIsPdfLoading(true);
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
      link.download = 'solvem8_solution.pdf';
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
      setIsPdfLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!solution) return;
    
    try {
      await navigator.clipboard.writeText(solution);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "Solution text has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Clipboard error:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy solution to clipboard",
        variant: "destructive"
      });
    }
  };

  // Show placeholder if no solution is available
  if (!solution) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 sticky top-24 animate-fade-in">
        <div className="text-center py-8">
          <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Solution Yet</h3>
          <p className="text-gray-600">Upload an assignment file or enter your question to get started</p>
          
          <div className="mt-6 flex flex-col space-y-2 max-w-xs mx-auto text-center text-sm">
            <div className="flex items-center text-primary-green">
              <div className="w-6 h-6 rounded-full bg-primary-green bg-opacity-10 flex items-center justify-center mr-2">
                <span className="text-primary-green font-medium">1</span>
              </div>
              <span>Upload your assignment</span>
            </div>
            <div className="flex items-center text-primary-green">
              <div className="w-6 h-6 rounded-full bg-primary-green bg-opacity-10 flex items-center justify-center mr-2">
                <span className="text-primary-green font-medium">2</span>
              </div>
              <span>Our AI analyzes the content</span>
            </div>
            <div className="flex items-center text-primary-green">
              <div className="w-6 h-6 rounded-full bg-primary-green bg-opacity-10 flex items-center justify-center mr-2">
                <span className="text-primary-green font-medium">3</span>
              </div>
              <span>Get your detailed solution</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6 sticky top-24 overflow-auto max-h-[calc(100vh-160px)] animate-fade-in">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Solution</h3>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center">
            <span className="mr-1">Attempts:</span>
            <span className="font-medium">{attemptCount}/{maxAttempts}</span>
          </div>
          <button 
            onClick={copyToClipboard}
            className="text-gray-500 hover:text-primary-green p-1 rounded transition-colors"
            aria-label="Copy solution to clipboard"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </div>
      
      {question && (
        <div className="p-4 bg-gray-50 rounded-lg mb-4 border border-gray-100">
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-2 text-gray-900">Question:</p>
            <p className="whitespace-pre-wrap">{question}</p>
          </div>
        </div>
      )}
      
      <div className="p-4 bg-primary-green/5 border border-primary-green/20 rounded-lg mb-4">
        <div className="text-sm">
          <p className="font-medium mb-2 text-primary-green">Solution:</p>
          <div className="whitespace-pre-line text-gray-800 prose prose-sm max-w-none">{solution}</div>
        </div>
      </div>
      
      {/* Extracted Text Display */}
      {extractedText && (
        <Accordion type="single" collapsible className="mb-4">
          <AccordionItem value="extracted-text" className="border border-gray-200 rounded-lg overflow-hidden">
            <AccordionTrigger className="py-3 px-4 bg-gray-50 hover:bg-gray-100">
              <div className="flex items-center">
                <FileDown className="mr-2 h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">View Extracted Text</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 bg-white border-t border-gray-200">
              <div className="max-h-60 overflow-y-auto text-sm text-gray-700 whitespace-pre-wrap">
                {extractedText}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <Separator className="my-4" />
      
      <div className="flex flex-wrap gap-3">
        <Button 
          className="flex-1 min-w-[140px] bg-primary-green hover:bg-primary-green/90 text-white transition-all"
          onClick={generatePdf}
          disabled={isPdfLoading}
        >
          {isPdfLoading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-5 w-5 mr-2" />
              Download PDF
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="flex-1 min-w-[140px] border-accent-purple text-accent-purple hover:bg-accent-purple/10 transition-all"
          onClick={onRefine}
          disabled={attemptCount >= maxAttempts || isLoading || isPdfLoading}
        >
          {isLoading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-accent-purple border-t-transparent rounded-full" />
              Refining...
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5 mr-2" />
              Refine Solution
              {attemptCount >= maxAttempts && " (None left)"}
            </>
          )}
        </Button>
      </div>
      
      {attemptCount >= maxAttempts && (
        <div className="mt-3 text-center text-xs text-gray-500">
          You've used all your free refinements. Subscribe to get unlimited access.
        </div>
      )}
    </div>
  );
};

export default SolutionDisplay;
