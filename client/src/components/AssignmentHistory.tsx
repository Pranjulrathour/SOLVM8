import { useEffect, useState } from 'react';
import { Eye, Download, Calendar, FileText, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export interface Assignment {
  id: string;
  fileName: string;
  processedDate: string;
  fileUrl: string;
  processedOutputUrl: string;
  question?: string;
  solution?: string;
  extractedText?: string;
}

interface AssignmentHistoryProps {
  onViewAssignment: (assignment: Assignment) => void;
  fullHistory?: boolean;
}

const AssignmentHistory: React.FC<AssignmentHistoryProps> = ({ 
  onViewAssignment,
  fullHistory = false
}) => {
  const { toast } = useToast();
  
  const { data: assignments, isLoading, error } = useQuery<Assignment[]>({
    queryKey: ['/api/assignments'],
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Failed to load assignment history",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const downloadPdf = async (assignment: Assignment) => {
    try {
      // Create a link element to download the file
      const link = document.createElement('a');
      link.href = assignment.processedOutputUrl;
      link.download = `${assignment.fileName.split('.')[0]}_solution.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your solution PDF is being downloaded",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the solution PDF",
        variant: "destructive"
      });
    }
  };

  // Display assignments - if fullHistory is true, show all assignments
  // Otherwise, limit to the 3 most recent ones
  const displayedAssignments = fullHistory 
    ? assignments 
    : assignments?.slice(0, 3);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {fullHistory ? "Assignment History" : "Recent Assignments"}
          </h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded-md"></div>
          <div className="h-16 bg-gray-200 rounded-md"></div>
          <div className="h-16 bg-gray-200 rounded-md"></div>
        </div>
      </div>
    );
  }

  const renderAssignmentItem = (assignment: Assignment, index: number, total: number) => (
    <div 
      key={assignment.id} 
      className={`border-b border-gray-200 pb-4 mb-4 transition-all-smooth hover:bg-gray-50 rounded-md p-2 ${
        index === total - 1 ? 'border-0 mb-0 pb-2' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-3">
          <div className="bg-primary-green/10 rounded-md p-2 mt-1">
            <FileText className="h-5 w-5 text-primary-green" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">{assignment.fileName}</h4>
            <p className="text-sm text-gray-500 flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1 inline" />
              {new Date(assignment.processedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div className="flex space-x-1">
          <button 
            className="p-2 text-gray-600 hover:text-accent-purple rounded-md hover:bg-accent-purple/5 transition-all-smooth"
            onClick={() => onViewAssignment(assignment)}
            title="View assignment"
          >
            <Eye className="h-5 w-5" />
          </button>
          <button 
            className="p-2 text-gray-600 hover:text-primary-green rounded-md hover:bg-primary-green/5 transition-all-smooth"
            onClick={() => downloadPdf(assignment)}
            title="Download solution PDF"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {fullHistory && assignment.question && (
        <div className="mt-2 ml-10 text-sm text-gray-600 line-clamp-1">
          <span className="font-medium">Question:</span> {assignment.question}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-md p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {fullHistory ? "Assignment History" : "Recent Assignments"}
        </h3>
        {!fullHistory && assignments && assignments.length > 3 && (
          <a href="#/history" className="text-sm text-accent-purple hover:underline">
            View All
          </a>
        )}
      </div>
      
      {displayedAssignments && displayedAssignments.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {displayedAssignments.map((assignment, index) => 
            renderAssignmentItem(assignment, index, displayedAssignments.length)
          )}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No assignments yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Upload your first assignment to get started
          </p>
        </div>
      )}
    </div>
  );
};

export default AssignmentHistory;
