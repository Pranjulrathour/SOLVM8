import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import FileUpload from "@/components/FileUpload";
import SolutionDisplay from "@/components/SolutionDisplay";
import AssignmentHistory, { Assignment } from "@/components/AssignmentHistory";
import SubscriptionModal from "@/components/SubscriptionModal";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, BarChart3, Clock, ScrollText } from "lucide-react";

const Dashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentFileUrl, setCurrentFileUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [solution, setSolution] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [activeTab, setActiveTab] = useState("dashboard");
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
    if (!user || (user.freeAttempts <= 0 && attemptCount === 0)) {
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
    // If extractedText is available in the assignment, use it; otherwise fall back to question
    setExtractedText(assignment.extractedText || assignment.question || '');
    setSolution(assignment.solution || null);
    setAttemptCount(3); // Set to max to disable refine button for history items
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user.username}</h2>
              <p className="text-gray-500">{user.email}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-primary-green/10 rounded-full px-4 py-2 flex items-center">
                <span className="text-primary-green font-medium">{user.freeAttempts}</span>
                <span className="text-primary-green ml-1">free attempts left</span>
              </div>
              
              <button 
                onClick={() => setShowSubscriptionModal(true)}
                className="bg-accent-purple text-white px-4 py-2 rounded-md text-sm font-medium transition-all-smooth hover:bg-accent-purple/90 active:scale-95"
              >
                Upgrade
              </button>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="dashboard" className="mb-6 animate-fade-in">
          <TabsList className="bg-white border border-gray-200 shadow-sm">
            <TabsTrigger 
              value="dashboard" 
              onClick={() => setActiveTab("dashboard")}
              className="data-[state=active]:bg-primary-green/10 data-[state=active]:text-primary-green"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              onClick={() => setActiveTab("history")}
              className="data-[state=active]:bg-primary-green/10 data-[state=active]:text-primary-green"
            >
              <Clock className="h-4 w-4 mr-2" />
              Assignment History
            </TabsTrigger>
            <TabsTrigger 
              value="account" 
              onClick={() => setActiveTab("account")}
              className="data-[state=active]:bg-primary-green/10 data-[state=active]:text-primary-green"
            >
              <User className="h-4 w-4 mr-2" />
              Account
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="mt-6">
            <div className="flex flex-col lg:flex-row lg:space-x-6">
              <div className="lg:w-2/3 space-y-6">
                {/* File Upload Component */}
                <FileUpload onFileUploaded={handleFileUploaded} />
                
                {/* Text Input Section */}
                <div className="bg-white rounded-xl shadow-md p-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Enter Assignment Question</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                      <textarea 
                        value={extractedText} 
                        onChange={e => setExtractedText(e.target.value)}
                        placeholder="Type or paste your question here..."
                        className="w-full min-h-[250px] p-4 font-mono text-sm focus:ring-primary-green focus:border-primary-green transition-all-smooth"
                        style={{ 
                          resize: 'vertical',
                          lineHeight: '1.5',
                          overflowY: 'auto'
                        }}
                      />
                      
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                          onClick={() => {
                            const textarea = document.querySelector('textarea');
                            if (textarea) {
                              textarea.style.height = `${Math.max(250, textarea.scrollHeight + 20)}px`;
                            }
                          }}
                          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all-smooth"
                          title="Expand editor"
                        >
                          <span className="sr-only">Expand</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"/>
                            <path d="M3 16.2V21m0 0h4.8M3 21l6-6"/>
                            <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"/>
                            <path d="M3 7.8V3m0 0h4.8M3 3l6 6"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {extractedText.length > 0 ? `${extractedText.length} characters` : ''}
                      </div>
                      
                      <button 
                        onClick={() => setExtractedText('')}
                        className={`text-xs text-red-500 hover:text-red-700 transition-all-smooth ${
                          !extractedText ? 'opacity-0 pointer-events-none' : ''
                        }`}
                      >
                        Clear
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => processAssignment(extractedText)}
                      disabled={!extractedText || isProcessing}
                      className="w-full py-2.5 bg-primary-green text-white rounded-md font-medium transition-all-smooth hover:bg-primary-green/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Processing...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                          <ScrollText className="h-5 w-5 mr-2" />
                          Generate Solution
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Recent Assignments */}
                <AssignmentHistory onViewAssignment={handleViewAssignment} />
              </div>
              
              {/* Solution Display */}
              <div className="lg:w-1/3 mt-6 lg:mt-0">
                <SolutionDisplay 
                  solution={solution}
                  question={extractedText}
                  fileUrl={currentFileUrl}
                  attemptCount={attemptCount}
                  maxAttempts={3}
                  onRefine={handleRefineSolution}
                  extractedText={extractedText}
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="mt-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Assignment History</h2>
              <AssignmentHistory onViewAssignment={handleViewAssignment} fullHistory={true} />
            </div>
          </TabsContent>
          
          <TabsContent value="account" className="mt-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-700 mb-2">Profile Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <input 
                        type="text" 
                        value={user.username} 
                        disabled
                        className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input 
                        type="email" 
                        value={user.email} 
                        disabled
                        className="w-full p-2 bg-gray-100 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-700 mb-2">Subscription</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">Free Plan</p>
                        <p className="text-sm text-gray-500">3 free attempts per month</p>
                      </div>
                      <button 
                        onClick={() => setShowSubscriptionModal(true)}
                        className="bg-accent-purple text-white px-3 py-1.5 rounded-md text-sm font-medium"
                      >
                        Upgrade
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
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
