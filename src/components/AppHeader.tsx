
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  step: "auth" | "upload" | "config" | "view";
  onRestart: () => void;
};

const AppHeader = ({ step, onRestart }: AppHeaderProps) => {
  return (
    <header className="w-full z-20 shadow-elegant sticky top-0 animate-fade-in bg-gradient-to-r from-teal-600 via-purple-600 to-purple-700 border-b border-purple-700/30">
      <div className="max-w-screen-2xl mx-auto app-header-compact bg-transparent">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30">
            <span className="text-lg font-bold text-white">CU</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-base tracking-tight text-white">Centurion University</span>
            <span className="text-xs text-white/80 font-medium">Timetable Scheduler</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs px-3 py-1 bg-white/15 text-white rounded-full font-semibold border border-white/30 backdrop-blur-sm">
              Administration
            </span>
            <span className="text-xs px-3 py-1 bg-green-300/20 text-green-50 rounded-full font-semibold border border-green-300/30 backdrop-blur-sm">
              Active
            </span>
          </div>

          {step === "view" && (
            <Button 
              variant="outline" 
              onClick={onRestart}
              className="border-white/40 hover:bg-white/20 text-white transition-smooth backdrop-blur-sm"
            >
              Exit
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
