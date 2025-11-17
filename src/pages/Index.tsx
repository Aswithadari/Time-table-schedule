


import { useState, useRef } from "react";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import MainContent from "../components/MainContent";
import { cn } from "@/lib/utils";

const Index = () => {
  const [currentStep, setCurrentStep] = useState<"auth" | "upload" | "config" | "view">("auth");
  const restartFunctionRef = useRef<(() => void) | null>(null);

  const handleStepChange = (step: "auth" | "upload" | "config" | "view") => {
    setCurrentStep(step);
  };

  const handleRestartChange = (restart: () => void) => {
    restartFunctionRef.current = restart;
  };

  const handleRestart = () => {
    if (restartFunctionRef.current) {
      restartFunctionRef.current();
    }
  };

  return (
    <div className="min-h-screen w-full text-foreground flex flex-col bg-gradient-to-br from-purple-50 via-teal-50 to-purple-100">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/3 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-1/4 w-80 h-80 bg-purple-400/8 rounded-full blur-3xl"></div>
      </div>

      <AppHeader step={currentStep} onRestart={handleRestart} />
      
      <main className={cn("flex-1 flex flex-col max-w-screen-2xl w-full mx-auto px-4 py-6 animate-slide-up relative z-10")}>
        <MainContent 
          onStepChange={handleStepChange}
          onRestartChange={handleRestartChange}
        />
      </main>
      
      <AppFooter />
    </div>
  );
};

export default Index;
