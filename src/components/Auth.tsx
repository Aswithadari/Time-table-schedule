
import { useState } from "react";
import { Button } from "@/components/ui/button";

type AuthProps = {
  onAuthSuccess: () => void;
};

const Auth = ({ onAuthSuccess }: AuthProps) => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // TODO: integrate real Supabase auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // TEMP: stub "admin@centurion.edu" + "password" works
    if (email === "admin@centurion.edu" && pw === "password") {
      setTimeout(() => {
        setLoading(false);
        onAuthSuccess();
      }, 400);
    } else {
      setTimeout(() => {
        setError("Invalid email or password (demo: admin@centurion.edu / password)");
        setLoading(false);
      }, 400);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-2xl border border-blue-400/30">
              <span className="text-4xl font-bold text-white">CU</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Centurion University</h1>
          <p className="text-blue-200 font-medium">Class Schedule Management System</p>
          <p className="text-slate-400 text-sm mt-2">Administrative Access</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-slate-700/50 space-y-6">
          <h2 className="text-2xl font-bold text-white">Administrator Login</h2>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-200">Email Address</label>
              <input
                type="email"
                autoFocus
                aria-label="Email address"
                className="w-full border border-slate-600/50 bg-slate-700/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="admin@centurion.edu"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-200">Password</label>
              <input
                type="password"
                aria-label="Password"
                className="w-full border border-slate-600/50 bg-slate-700/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                value={pw}
                onChange={e => setPw(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 text-red-200 text-sm">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading || !email || !pw} 
            size="lg" 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="bg-slate-700/30 rounded-lg px-4 py-3 border border-slate-600/50">
            <p className="text-xs text-slate-300 text-center mb-2 font-semibold">Demo Credentials</p>
            <div className="text-xs text-slate-400 space-y-1 text-center">
              <p><span className="font-mono bg-slate-600/30 px-2 py-1 rounded">admin@centurion.edu</span></p>
              <p><span className="font-mono bg-slate-600/30 px-2 py-1 rounded">password</span></p>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 border-t border-slate-700/50 pt-6">
            <p>Centurion University Administration Portal</p>
            <p className="text-slate-500 mt-1">© {new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
