import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthContext";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "motion/react";

const signupStoryImage = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 1200'>
    <defs>
      <linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#6e4f86'/>
        <stop offset='55%' stop-color='#2e2958'/>
        <stop offset='100%' stop-color='#12192f'/>
      </linearGradient>
    </defs>
    <rect width='900' height='1200' fill='url(#bg)'/>
    <circle cx='760' cy='190' r='250' fill='white' opacity='0.08'/>
    <circle cx='80' cy='1060' r='300' fill='white' opacity='0.06'/>
    <path d='M0 850 C 180 720, 340 980, 560 860 C 740 760, 820 940, 900 870 L900 1200 L0 1200 Z' fill='white' opacity='0.11'/>
    <path d='M58 150 H252' stroke='white' stroke-opacity='0.18' stroke-width='10' stroke-linecap='round'/>
    <path d='M58 180 H218' stroke='white' stroke-opacity='0.12' stroke-width='10' stroke-linecap='round'/>
    <path d='M58 210 H302' stroke='white' stroke-opacity='0.08' stroke-width='10' stroke-linecap='round'/>
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
    <div className="relative min-h-screen overflow-hidden px-6 py-8" style={{ backgroundImage: "var(--page-background)" }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-0 h-80 w-80 rounded-full opacity-16" style={{ background: "radial-gradient(circle, var(--texture-glow-b) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full opacity-12" style={{ background: "radial-gradient(circle, var(--texture-glow-a) 0%, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-34" style={{ backgroundImage: "linear-gradient(to right, var(--texture-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--texture-grid) 1px, transparent 1px)", backgroundSize: "88px 88px" }} />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[2rem] border border-white/8 bg-black/6 shadow-[0_24px_72px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:grid-cols-[0.96fr_1.04fr]">
        <motion.div
          className="flex items-center justify-center order-1 p-6 md:p-10 lg:p-12"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex items-center gap-3 text-foreground">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #DE6AE4, #6129CC)" }}>
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <p style={{ fontSize: "0.74rem", letterSpacing: "0.22em", textTransform: "uppercase" }}>Gradify</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>Build your study system from day one</p>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-muted-foreground" style={{ fontSize: "0.75rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                Create your account
              </p>
              <h1 className="mt-3" style={{ fontSize: "clamp(1.8rem, 3.2vw, 2.5rem)", lineHeight: "1.06", fontWeight: 700 }}>
                  Create your account.
              </h1>
              <p className="mt-3 text-muted-foreground" style={{ fontSize: "0.9rem", lineHeight: "1.7" }}>
                Set up your account to track reviews, weak spots, mastery trends, and grounded tutor conversations in one place.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)]/82 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)] backdrop-blur-sm">
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
              style={{ background: "linear-gradient(135deg, #9f67c8, #5f54b0)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" }}
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
        </motion.div>

        <motion.div
          className="relative hidden min-h-[720px] overflow-hidden order-2 lg:block"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={signupStoryImage} alt="Onboarding story illustration" className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,12,26,0.2) 0%, rgba(8,12,26,0.68) 100%)" }} />
          <div className="absolute inset-x-8 top-8 flex items-center gap-3 text-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p style={{ fontSize: "0.75rem", letterSpacing: "0.22em", textTransform: "uppercase" }}>Gradify</p>
              <p className="text-white/62" style={{ fontSize: "0.8rem" }}>Evidence-backed study coach</p>
            </div>
          </div>
          <div className="absolute inset-x-8 bottom-10 max-w-xl text-white">
            <p className="text-white/58" style={{ fontSize: "0.78rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>
              Gradify
            </p>
            <h2 className="mt-3" style={{ fontSize: "clamp(2.3rem, 4vw, 3.7rem)", lineHeight: "0.98", fontWeight: 700 }}>
              Build a quieter study system.
            </h2>
            <p className="mt-5 max-w-lg text-white/68" style={{ fontSize: "0.94rem", lineHeight: "1.72" }}>
              Set the system once. Gradify keeps the review queue, trust signals, and daily rhythm in view as each module compounds.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[["Uploads", "Structured"], ["Reviews", "Scheduled"], ["Tutor", "Grounded"]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/12 bg-black/14 px-4 py-3 backdrop-blur-sm">
                  <p className="text-white/54" style={{ fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
                  <p className="mt-1 text-white/88" style={{ fontSize: "1.02rem" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}