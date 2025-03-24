import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const Hero: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-center">
        <div className="md:w-1/2 mb-10 md:mb-0">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-4">
            Your AI-Powered <span className="text-primaryGreen">Assignment Buddy</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-xl">
            Upload your assignments and let our AI solve them for you. Get step-by-step solutions and explanations in seconds.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <Link href="/signup">
              <Button 
                size="lg" 
                className="px-6 py-6 bg-accentBluePurple hover:bg-accentBluePurple/90 text-white shadow-lg"
              >
                Get Started
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-6 py-6 border border-gray-300 text-gray-800 hover:bg-gray-50"
            >
              How it Works
            </Button>
          </div>
          <div className="mt-8 flex items-center text-sm text-gray-500">
            <svg className="h-5 w-5 text-primaryGreen mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            3 free solutions included with every new account
          </div>
        </div>
        <div className="md:w-1/2 relative">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden p-6">
            <div className="mb-4">
              <div className="text-lg font-medium text-gray-900 mb-1">Assignment Solution</div>
              <div className="text-sm text-gray-500">Chemistry - Stoichiometry Problem</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-2">Question:</p>
                <p>Calculate the mass of CO₂ produced when 5.0 g of C₃H₈ is completely combusted in oxygen.</p>
              </div>
            </div>
            <div className="p-4 bg-primaryGreen bg-opacity-5 border border-primaryGreen border-opacity-20 rounded-lg">
              <div className="text-sm text-gray-800">
                <p className="font-medium mb-2 text-primaryGreen">Solution:</p>
                <p className="mb-2">Step 1: Write the balanced equation for the combustion of propane (C₃H₈).</p>
                <p className="mb-2">C₃H₈ + 5O₂ → 3CO₂ + 4H₂O</p>
                <p className="mb-2">Step 2: Calculate the moles of C₃H₈.</p>
                <p className="mb-2">Moles of C₃H₈ = 5.0 g / 44.1 g/mol = 0.113 mol</p>
                <p className="mb-2">Step 3: Use the stoichiometric ratio to find moles of CO₂.</p>
                <p className="mb-2">Moles of CO₂ = 0.113 mol C₃H₈ × (3 mol CO₂ / 1 mol C₃H₈) = 0.339 mol</p>
                <p className="mb-2">Step 4: Convert moles of CO₂ to grams.</p>
                <p>Mass of CO₂ = 0.339 mol × 44.0 g/mol = 14.9 g</p>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-accentBluePurple rounded-full flex items-center justify-center -rotate-12 shadow-lg">
            <div className="text-white font-bold">AI</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
