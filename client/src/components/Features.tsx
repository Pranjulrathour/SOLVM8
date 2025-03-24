const Features: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto mt-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">How SOLVEM8 Works</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Get step-by-step solutions to your assignments in just a few clicks
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="w-12 h-12 bg-primaryGreen bg-opacity-10 rounded-full flex items-center justify-center mb-4">
            <span className="text-primaryGreen font-bold">1</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Your Assignment</h3>
          <p className="text-gray-600">
            Simply upload your assignments in PDF, DOCX, Excel, or image format.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="w-12 h-12 bg-primaryGreen bg-opacity-10 rounded-full flex items-center justify-center mb-4">
            <span className="text-primaryGreen font-bold">2</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">AI Processes Solution</h3>
          <p className="text-gray-600">
            Our advanced AI extracts and analyzes your questions to generate accurate solutions.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="w-12 h-12 bg-primaryGreen bg-opacity-10 rounded-full flex items-center justify-center mb-4">
            <span className="text-primaryGreen font-bold">3</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Download Solution</h3>
          <p className="text-gray-600">
            Review your step-by-step solution and download it as a formatted PDF.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Features;
