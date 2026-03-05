import React, { useState, useEffect } from "react";
import { supabase } from '../../supabase'
import { useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";

const loginStoryImage = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 1200'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#FF7541'/>
        <stop offset='100%' stop-color='#6129CC'/>
      </linearGradient>
    </defs>
    <rect width='900' height='1200' fill='url(#bg)'/>
    <circle cx='760' cy='220' r='240' fill='white' opacity='0.14'/>
    <circle cx='120' cy='1020' r='280' fill='white' opacity='0.12'/>
    <path d='M0 860 C 190 740, 320 980, 520 850 C 700 730, 840 930, 900 860 L900 1200 L0 1200 Z' fill='white' opacity='0.18'/>
    <text x='70' y='180' font-family='Inter, Arial, sans-serif' font-size='54' font-weight='700' fill='white'>Return To The Work</text>
    <text x='70' y='236' font-family='Inter, Arial, sans-serif' font-size='30' fill='white' opacity='0.9'>Small sessions build big mastery.</text>
  </svg>
`)}`;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const emailError = email.length > 0 && !email.includes("@") ? "Please enter a valid email" : "";
  const passwordError = password.length > 0 && password.length < 6 ? "Password must be at least 6 characters" : "";
  const canSubmit = email.includes("@") && password.length >= 6 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      navigate("/");
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #FF7541 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, #B352D7 0%, transparent 70%)" }} />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #6129CC 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-5xl relative grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--card)]">
        <div className="hidden lg:block relative min-h-[680px]">
          <img src={loginStoryImage} alt="Learning journey illustration" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/20 p-5">
            <p className="text-white" style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
              "The edge belongs to people who can focus repeatedly, not just intensely."
            </p>
          </div>
        </div>

        <div className="p-6 md:p-10 lg:p-12">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1>Welcome back</h1>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.875rem" }}>
              Sign in to continue learning
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="Enter your email"
                className={`w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                  emailError ? "focus:ring-red-500/50 border border-red-500/30" : "focus:ring-primary/50"
                }`}
                style={{ fontSize: "0.875rem" }}
              />
              {emailError && <p className="mt-1" style={{ fontSize: "0.7rem", color: "#ef4444" }}>{emailError}</p>}
            </div>

            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter your password"
                  className={`w-full bg-[var(--input-background)] rounded-xl px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                    passwordError ? "focus:ring-red-500/50 border border-red-500/30" : "focus:ring-primary/50"
                  }`}
                  style={{ fontSize: "0.875rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && <p className="mt-1" style={{ fontSize: "0.7rem", color: "#ef4444" }}>{passwordError}</p>}
            </div>

            <div className="text-right">
              <button type="button" className="text-primary cursor-pointer hover:underline" style={{ fontSize: "0.8rem" }}>
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p style={{ fontSize: "0.8rem", color: "#ef4444" }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl text-white transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #FF7541, #B352D7)" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span style={{ fontSize: "0.9rem" }}>{loading ? "Signing in..." : "Sign In"}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
              Don't have an account?{" "}
              <button onClick={() => navigate("/signup")} className="text-primary hover:underline cursor-pointer">
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}