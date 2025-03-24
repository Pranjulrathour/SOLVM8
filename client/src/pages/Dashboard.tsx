import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import SolutionDisplay from "@/components/SolutionDisplay";
import AssignmentHistory from "@/components/AssignmentHistory";
import SubscriptionModal from "@/components/SubscriptionModal";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Assignment {
  id: string;
  fileName: string;
  processedDate: string;
  fileUrl: string;
  processedOutputUrl: string;
  question: string;
  solution: string;
}

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [solution, setSolution] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleFileUploaded = (fileUrl: string, text: string) => {
    setCurrentFileUrl(fileUrl);
    setExtractedText(text);
    // Reset solution when a new file is uploaded
    setSolution(null);
    setAttemptCount(0);
    
    // Auto-process the file if there's extracted text
    if (text) {
      processAssignment(text);
    }
  };

  const processAssignment = async (text: string) => {
    if (!user || user.freeAttempts <= 0 && attemptCount === 0) {
      setShowSubscriptionModal(true);
      return;
    }
    
    setIsProcessing(true);
    try {
      const response = await apiRequest('POST', '/api/process', { 
        text,
        fileUrl: currentFileUrl
      });
      
      const data = await response.json();
      setSolution(data.solution);
      setAttemptCount(prev => prev + 1);
      
      // Invalidate assignments query to reflect updated attempt count
      queryClient.invalidateQueries({ queryKey: ['/api/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Solution generated",
        description: "Your assignment has been processed successfully",
      });
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process assignment",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefineSolution = () => {
    if (!extractedText) return;
    
    // Check if user has enough attempts
    if (user && (user.freeAttempts <= 0 || attemptCount >= 3)) {
      setShowSubscriptionModal(true);
      return;
    }
    
    processAssignment(extractedText);
  };

  const handleViewAssignment = (assignment: Assignment) => {
    setCurrentFileUrl(assignment.fileUrl);
    setExtractedText(assignment.question);
    setSolution(assignment.solution);
    setAttemptCount(3); // Set to max to disable refine button for history items
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) return null;

  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />
      
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button className="py-4 px-1 text-primaryGreen border-b-2 border-primaryGreen font-medium text-sm" aria-current="page">
              Dashboard
            </button>
            <button className="py-4 px-1 text-gray-500 border-b-2 border-transparent font-medium text-sm hover:text-gray-700 hover:border-gray-300">
              Assignment History
            </button>
            <button className="py-4 px-1 text-gray-500 border-b-2 border-transparent font-medium text-sm hover:text-gray-700 hover:border-gray-300">
              Account
            </button>
          </nav>
        </div>
      </div>
      
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:space-x-6">
          <div className="md:w-2/3">
            {/* User Info Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{user.username}</h2>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                <div className="bg-primaryGreen bg-opacity-10 rounded-full px-4 py-2">
                  <span className="text-primaryGreen font-medium">{user.freeAttempts}</span>
                  <span className="text-primaryGreen"> free attempts left</span>
                </div>
              </div>
            </div>
            
            {/* File Upload Component */}
            <FileUpload onFileUploaded={handleFileUploaded} />
            
            {/* Recent Assignments */}
            <AssignmentHistory onViewAssignment={handleViewAssignment} />
          </div>
          
          {/* Solution Display */}
          <div className="md:w-1/3 mt-6 md:mt-0">
            <SolutionDisplay 
              solution={solution}
              question={extractedText}
              fileUrl={currentFileUrl}
              attemptCount={attemptCount}
              maxAttempts={3}
              onRefine={handleRefineSolution}
            />
          </div>
        </div>
      </main>
      
      {/* Subscription Modal */}
      <SubscriptionModal 
        open={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        remainingAttempts={user.freeAttempts}
      />
    </div>
  );
};

export default Dashboard;
