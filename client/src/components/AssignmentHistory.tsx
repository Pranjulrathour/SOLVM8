import { useEffect, useState } from 'react';
import { Eye, Download } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Assignment {
  id: string;
  fileName: string;
  processedDate: string;
  fileUrl: string;
  processedOutputUrl: string;
}

interface AssignmentHistoryProps {
  onViewAssignment: (assignment: Assignment) => void;
}

const AssignmentHistory: React.FC<AssignmentHistoryProps> = ({ onViewAssignment }) => {
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
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the solution PDF",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Assignments</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-3"></div>
          <div className="h-12 bg-gray-200 rounded mb-3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Assignments</h3>
        {assignments && assignments.length > 3 && (
          <a href="#" className="text-sm text-accentBluePurple hover:underline">View All</a>
        )}
      </div>
      
      {assignments && assignments.length > 0 ? (
        assignments.map((assignment, index) => (
          <div 
            key={assignment.id} 
            className={`border-b border-gray-200 pb-4 mb-4 ${
              index === assignments.length - 1 ? 'border-0 mb-0 pb-0' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">{assignment.fileName}</h4>
                <p className="text-sm text-gray-500">Processed on {new Date(assignment.processedDate).toLocaleDateString()}</p>
              </div>
              <div className="flex space-x-2">
                <button 
                  className="p-2 text-gray-600 hover:text-accentBluePurple"
                  onClick={() => onViewAssignment(assignment)}
                >
                  <Eye className="h-5 w-5" />
                </button>
                <button 
                  className="p-2 text-gray-600 hover:text-accentBluePurple"
                  onClick={() => downloadPdf(assignment)}
                >
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <p className="text-center text-gray-500 py-4">No assignments processed yet</p>
      )}
    </div>
  );
};

export default AssignmentHistory;
