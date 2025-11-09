
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  step: "auth" | "upload" | "config" | "view";
  onRestart: () => void;
};

const AppHeader = ({ step, onRestart }: AppHeaderProps) => {
  return (
    <header className="w-full glass border-b border-border/50 z-20 shadow-elegant sticky top-0 animate-fade-in bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg border border-blue-400/30">
              <span className="text-2xl font-bold text-white">CU</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white">Centurion University</span>
              <span className="text-xs text-blue-200 font-medium">Class Schedule Management System</span>
            </div>
          </div>
          <div className="hidden md:flex gap-2">
            <span className="text-xs px-3 py-1 bg-blue-500/20 text-blue-200 rounded-full font-semibold border border-blue-500/40">
              Administration
            </span>
            <span className="text-xs px-3 py-1 bg-green-500/20 text-green-200 rounded-full font-semibold border border-green-500/40">
              Active
            </span>
          </div>
        </div>
        {step === "view" && (
          <Button 
            variant="outline" 
            onClick={onRestart}
            className="glass border-blue-400/30 hover:bg-blue-500/20 text-blue-100 hover:text-blue-50 transition-smooth"
          >
            Exit & Logout
          </Button>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
