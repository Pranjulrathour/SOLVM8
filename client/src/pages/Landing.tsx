import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";

const Landing: React.FC = () => {
  return (
    <div className="bg-gray-100 min-h-screen">
      <Navbar />
      <main>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <Hero />
          <Features />
        </div>
      </main>
    </div>
  );
};

export default Landing;
