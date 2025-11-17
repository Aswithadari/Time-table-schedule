
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
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-900 via-teal-700 to-purple-800">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-2xl border border-gray-200">
              <span className="text-4xl font-bold text-teal-600">CU</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Centurion University</h1>
          <p className="text-white font-medium">Class Schedule Management System</p>
          <p className="text-white/90 text-sm mt-2">Administrative Access</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 space-y-6">
          <h2 className="text-2xl font-bold text-white">Administrator Login</h2>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-white">Email Address</label>
              <input
                type="email"
                autoFocus
                aria-label="Email address"
                className="w-full border border-white/30 bg-white/20 rounded-lg px-4 py-3 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent transition-all"
                placeholder="admin@centurion.edu"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-white">Password</label>
              <input
                type="password"
                aria-label="Password"
                className="w-full border border-white/30 bg-white/20 rounded-lg px-4 py-3 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                value={pw}
                onChange={e => setPw(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/50 rounded-lg px-4 py-3 text-red-100 text-sm">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading || !email || !pw} 
            size="lg" 
            className="w-full bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 text-white font-semibold rounded-lg transition-all shadow-lg"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="bg-white/15 rounded-lg px-4 py-3 border border-white/30">
            <p className="text-xs text-white text-center mb-2 font-semibold">Demo Credentials</p>
            <div className="text-xs text-white/90 space-y-1 text-center">
              <p><span className="font-mono bg-white/20 px-2 py-1 rounded text-white">admin@centurion.edu</span></p>
              <p><span className="font-mono bg-white/20 px-2 py-1 rounded text-white">password</span></p>
            </div>
          </div>

          <div className="text-center text-xs text-white/80 border-t border-white/20 pt-6">
            <p>Centurion University Administration Portal</p>
            <p className="text-white/70 mt-1">© {new Date().getFullYear()} All Rights Reserved</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
