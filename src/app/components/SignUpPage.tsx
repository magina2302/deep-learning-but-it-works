import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";

const signupStoryImage = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 1200'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#DE6AE4'/>
        <stop offset='100%' stop-color='#6129CC'/>
      </linearGradient>
    </defs>
    <rect width='900' height='1200' fill='url(#bg)'/>
    <circle cx='760' cy='190' r='250' fill='white' opacity='0.15'/>
    <circle cx='80' cy='1060' r='300' fill='white' opacity='0.11'/>
    <path d='M0 850 C 180 720, 340 980, 560 860 C 740 760, 820 940, 900 870 L900 1200 L0 1200 Z' fill='white' opacity='0.18'/>
    <text x='66' y='182' font-family='Inter, Arial, sans-serif' font-size='52' font-weight='700' fill='white'>Start The Journey</text>
    <text x='66' y='236' font-family='Inter, Arial, sans-serif' font-size='30' fill='white' opacity='0.9'>Build your learning system from day one.</text>
  </svg>
`)}`;

export function SignUpPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const usernameError = username.length > 0 && username.length < 2 ? "Username must be at least 2 characters" : "";
  const emailError = email.length > 0 && !email.includes("@") ? "Please enter a valid email" : "";
  const passwordError = password.length > 0 && password.length < 4 ? "Password must be at least 4 characters" : "";
  const confirmError = confirmPassword.length > 0 && confirmPassword !== password ? "Passwords don't match" : "";
  const canSubmit = username.length >= 2 && email.includes("@") && password.length >= 4 && confirmPassword === password && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const success = await signup(username, email, password);
    setLoading(false);
    if (success) {
      navigate("/");
    } else {
      setError("Could not create account. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #DE6AE4 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-15" style={{ background: "radial-gradient(circle, #6129CC 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #FF7541 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-5xl relative grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden border border-[var(--border)] bg-[var(--card)]">
        <div className="hidden lg:block relative min-h-[720px] order-2 lg:order-1">
          <img src={signupStoryImage} alt="Onboarding story illustration" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-8 left-8 right-8 rounded-2xl bg-black/25 backdrop-blur-sm border border-white/20 p-5">
            <p className="text-white" style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
              "Learning systems beat motivation spikes. Design the system, then trust it."
            </p>
          </div>
        </div>

        <div className="p-6 md:p-10 lg:p-12 order-1 lg:order-2">
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #DE6AE4, #6129CC)" }}
            >
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1>Create your account</h1>
            <p className="text-muted-foreground mt-1" style={{ fontSize: "0.875rem" }}>
              Start your learning journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="Choose a username"
                className={`w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                  usernameError ? "focus:ring-red-500/50 border border-red-500/30" : "focus:ring-primary/50"
                }`}
                style={{ fontSize: "0.875rem" }}
              />
              {usernameError && <p className="mt-1" style={{ fontSize: "0.7rem", color: "#ef4444" }}>{usernameError}</p>}
            </div>

            {/* Email — now required */}
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={`w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                  emailError ? "focus:ring-red-500/50 border border-red-500/30" : "focus:ring-primary/50"
                }`}
                style={{ fontSize: "0.875rem" }}
              />
              {emailError && <p className="mt-1" style={{ fontSize: "0.7rem", color: "#ef4444" }}>{emailError}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Create a password"
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
              {password.length >= 4 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex-1 h-1 rounded-full"
                      style={{
                        backgroundColor:
                          password.length >= 8 && i <= 4 ? "#10b981" :
                          password.length >= 6 && i <= 3 ? "#f59e0b" :
                          i <= 2 ? "#ef4444" : "var(--accent)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block mb-1.5" style={{ fontSize: "0.8rem" }}>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                placeholder="Confirm your password"
                className={`w-full bg-[var(--input-background)] rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all ${
                  confirmError ? "focus:ring-red-500/50 border border-red-500/30" : "focus:ring-primary/50"
                }`}
                style={{ fontSize: "0.875rem" }}
              />
              {confirmError && <p className="mt-1" style={{ fontSize: "0.7rem", color: "#ef4444" }}>{confirmError}</p>}
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
              style={{ background: "linear-gradient(135deg, #DE6AE4, #6129CC)" }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span style={{ fontSize: "0.9rem" }}>{loading ? "Creating account..." : "Create Account"}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground" style={{ fontSize: "0.8rem" }}>
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="text-primary hover:underline cursor-pointer">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}