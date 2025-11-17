
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
          <div className="w-11 h-11 rounded-lg bg-white flex items-center justify-center shadow-lg border border-gray-200">
            <span className="text-lg font-bold text-teal-600">CU</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-base tracking-tight text-white">Centurion University</span>
            <span className="text-xs text-white/90 font-medium">Timetable Scheduler</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs px-3 py-1 bg-white/80 text-teal-900 rounded-full font-semibold border border-white/80">
              Administration
            </span>
            <span className="text-xs px-3 py-1 bg-green-200 text-green-900 rounded-full font-semibold border border-green-300">
              Active
            </span>
          </div>

          {step === "view" && (
            <Button 
              variant="outline" 
              onClick={onRestart}
              className="border-white/60 hover:bg-white/30 text-white transition-smooth"
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
