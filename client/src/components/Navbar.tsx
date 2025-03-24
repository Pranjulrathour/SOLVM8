import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [location] = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/">
              <a className="text-2xl font-bold text-primaryGreen">SOLVEM8</a>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className={`text-gray-600 hover:text-primaryGreen font-medium ${location === '/' && 'text-primaryGreen'}`}>
                Home
              </a>
            </Link>
            <a href="#" className="text-gray-600 hover:text-primaryGreen font-medium">
              Pricing
            </a>
            <a href="#" className="text-gray-600 hover:text-primaryGreen font-medium">
              How it Works
            </a>
            <a href="#" className="text-gray-600 hover:text-primaryGreen font-medium">
              FAQ
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <Button 
                  variant="default" 
                  className="bg-accentBluePurple hover:bg-accentBluePurple/90 text-white"
                  onClick={logout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-accentBluePurple hover:bg-accentBluePurple/90 text-white">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
