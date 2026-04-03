import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";
import {
  Eye, EyeOff, ArrowLeft, CheckCircle2,
  GraduationCap, Store, Loader2, Sparkles, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const isEduEmail = (email: string) =>
  /\.(edu|edu\.ng|ac\.uk|ac\.za|edu\.gh|edu\.ke)$/i.test(email.trim());

const extractSchool = (email: string) => {
  const domain = email.split("@")[1] || "";
  const parts = domain.split(".");
  const idx = parts.findIndex((p) => p === "edu" || p === "ac");
  return (idx > 0 ? parts[idx - 1] : parts[0]).toUpperCase();
};

const TOTAL_STEPS = 4;

const slide = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  animate: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);

  const [isStudent, setIsStudent] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"buyer" | "seller" | "both">("both");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [phone, setPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // When Supabase fires SIGNED_IN (magic link clicked), skip OTP step and go to profile setup
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" && step === 3) {
        go(4);
      }
    });
    return () => subscription.unsubscribe();
  }, [step]);

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(next);
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/register` },
    });
    if (error) { toast.error(error.message); setGoogleLoading(false); }
    // page will redirect to Google — no need to setGoogleLoading(false) on success
  };

  const sendOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed) { setEmailError("Please enter your email"); return; }
    if (isStudent && !isEduEmail(trimmed)) {
      setEmailError("Must be a valid school email (.edu or .edu.ng)");
      return;
    }
    setEmailError("");
    setSendingOtp(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/register` },
    });
    setSendingOtp(false);
    if (error) { toast.error(error.message); return; }
    setResendCooldown(60);
    go(3);
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { toast.error("Enter the full 6-digit code"); return; }
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: "email",
    });
    setVerifying(false);
    if (error) { toast.error("Invalid or expired code. Try again."); return; }
    go(4);
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/register` },
    });
    setResending(false);
    if (error) { toast.error(error.message); return; }
    setResendCooldown(60);
    toast.success("Code resent!");
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length === 6) { setOtp(digits); otpRefs.current[5]?.focus(); }
  };

  const createAccount = async () => {
    if (!fullName.trim()) { toast.error("Enter your full name"); return; }
    if (!username.trim()) { toast.error("Enter a username"); return; }
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setCreating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: {
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          account_type: accountType,
          department: department || null,
          level: level ? parseInt(level) : null,
          is_student: isStudent,
          school: isStudent ? extractSchool(email) : null,
          phone: phone.trim() || null,
        },
      });
      if (error) throw error;
      go(5);
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    }
    setCreating(false);
  };

  const progress = step <= TOTAL_STEPS ? Math.round(((step - 1) / TOTAL_STEPS) * 100) : 100;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-primary blur-xl opacity-40" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/70 shadow-2xl shadow-primary/40">
              <span className="font-display text-3xl font-black text-primary-foreground">U</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> Campus Marketplace
          </span>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-2xl backdrop-blur-xl">
          {step <= TOTAL_STEPS && (
            <div className="h-1 w-full bg-muted">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/70"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              />
            </div>
          )}

          <div className="p-7">
            {step > 1 && step <= TOTAL_STEPS && (
              <div className="mb-5 flex items-center justify-between">
                <button
                  onClick={() => go(step - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-muted-foreground">Step {step} of {TOTAL_STEPS}</span>
              </div>
            )}

            <AnimatePresence mode="wait" custom={dir}>

              {/* ── STEP 1: Welcome ── */}
              {step === 1 && (
                <motion.div key="s1" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="mb-7 text-center">
                    <h1 className="font-display text-2xl font-bold">Welcome to UniMart</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Campus marketplace for verified students</p>
                  </div>
                  <p className="mb-4 text-center text-sm font-semibold">Are you a student?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => { setIsStudent(true); go(2); }}
                      className="flex flex-col items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 transition-all hover:border-primary hover:bg-primary/10 active:scale-95"
                    >
                      <GraduationCap className="h-8 w-8 text-primary" />
                      <span className="text-sm font-semibold">Yes, I'm a student</span>
                    </button>
                    <button
                      onClick={() => { setIsStudent(false); go(2); }}
                      className="flex flex-col items-center gap-3 rounded-2xl border-2 border-border/60 bg-muted/30 p-5 transition-all hover:border-border hover:bg-muted/60 active:scale-95"
                    >
                      <Store className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm font-semibold text-muted-foreground">No, continue</span>
                    </button>
                  </div>

                  {/* Google */}
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border/50" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border/50" />
                  </div>
                  <button
                    onClick={signInWithGoogle}
                    disabled={googleLoading}
                    className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border-2 border-border/60 bg-card font-semibold text-sm transition-all hover:bg-muted/50 hover:border-border active:scale-[0.98] disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    Continue with Google
                  </button>

                  <p className="mt-5 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
                  </p>
                </motion.div>
              )}

              {/* ── STEP 2: Email ── */}
              {step === 2 && (
                <motion.div key="s2" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="mb-6">
                    <h2 className="font-display text-xl font-bold">
                      {isStudent ? "Enter your school email" : "Enter your email"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isStudent ? "Only verified students can join" : "We'll send you a verification code"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={isStudent ? "yourname@school.edu.ng" : "you@example.com"}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                      className={cn(
                        "h-12 rounded-2xl bg-muted/40 px-4 text-sm",
                        emailError && "border-destructive focus-visible:ring-destructive"
                      )}
                      autoFocus
                    />
                    {emailError && <p className="text-xs text-destructive">{emailError}</p>}
                    {isStudent && (
                      <p className="text-xs text-muted-foreground">
                        Accepted: .edu, .edu.ng, .ac.uk, .ac.za, .edu.gh
                      </p>
                    )}
                  </div>
                  <Button
                    className="mt-6 h-12 w-full rounded-2xl font-bold shadow-lg shadow-primary/20"
                    onClick={sendOtp}
                    disabled={sendingOtp || !email.trim()}
                  >
                    {sendingOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending code...</> : "Continue"}
                  </Button>
                </motion.div>
              )}

              {/* ── STEP 3: OTP ── */}
              {step === 3 && (
                <motion.div key="s3" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="h-7 w-7 text-primary" />
                    </div>
                    <h2 className="font-display text-xl font-bold">Verify your email</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      We sent a 6-digit code to
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground break-all">{email}</p>
                  </div>

                  {/* OTP boxes */}
                  <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKey(i, e)}
                        autoFocus={i === 0}
                        className={cn(
                          "h-12 w-11 rounded-xl border-2 bg-muted/40 text-center text-lg font-bold transition-all outline-none",
                          "focus:border-primary focus:bg-primary/5",
                          digit ? "border-primary/60" : "border-border/60"
                        )}
                      />
                    ))}
                  </div>

                  <Button
                    className="mt-6 h-12 w-full rounded-2xl font-bold shadow-lg shadow-primary/20"
                    onClick={verifyOtp}
                    disabled={verifying || otp.join("").length < 6}
                  >
                    {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify"}
                  </Button>

                  <div className="mt-4 text-center">
                    <button
                      onClick={resendOtp}
                      disabled={resendCooldown > 0 || resending}
                      className={cn(
                        "text-sm transition-colors",
                        resendCooldown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary hover:underline"
                      )}
                    >
                      {resending ? "Resending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 4: Basic Info ── */}
              {step === 4 && (
                <motion.div key="s4" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="mb-5">
                    <h2 className="font-display text-xl font-bold">Complete your profile</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Almost there — just a few more details</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)}
                        className="h-11 rounded-2xl bg-muted/40" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Username</Label>
                      <Input placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                        className="h-11 rounded-2xl bg-muted/40" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Min 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 rounded-2xl bg-muted/40 pr-11"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="tel"
                          placeholder="+234 800 000 0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-11 rounded-2xl bg-muted/40 pl-9"
                        />
                      </div>
                    </div>

                    {/* Account type */}
                    <div className="space-y-2">
                      <Label>I want to</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["buyer", "seller", "both"] as const).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setAccountType(t)}
                            className={cn(
                              "rounded-xl border-2 py-2.5 text-xs font-semibold transition-all",
                              accountType === t
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border"
                            )}
                          >
                            {t === "buyer" ? "🛒 Buy" : t === "seller" ? "💰 Sell" : "🔄 Both"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional fields */}
                    <div className="space-y-1.5">
                      <Label>Department <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger className="h-11 rounded-2xl bg-muted/40">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Level <span className="text-muted-foreground text-xs">(optional)</span></Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger className="h-11 rounded-2xl bg-muted/40">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((l) => <SelectItem key={l} value={String(l)}>{l} Level</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    className="mt-6 h-12 w-full rounded-2xl font-bold shadow-lg shadow-primary/20"
                    onClick={createAccount}
                    disabled={creating || !fullName.trim() || !username.trim() || password.length < 6}
                  >
                    {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</> : "Create Account"}
                  </Button>
                </motion.div>
              )}

              {/* ── STEP 5: Success ── */}
              {step === 5 && (
                <motion.div key="s5" custom={dir} variants={slide} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.28 }}>
                  <div className="flex flex-col items-center py-4 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
                    >
                      <CheckCircle2 className="h-10 w-10 text-primary" />
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <h2 className="mt-5 font-display text-2xl font-bold">Account Created!</h2>
                      <p className="mt-1 text-muted-foreground text-sm">Welcome to UniMart 🎉</p>
                      {isStudent && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified Student ✅
                        </div>
                      )}
                      <p className="mt-4 text-sm text-muted-foreground">
                        School: <span className="font-semibold text-foreground">{isStudent ? extractSchool(email) : "—"}</span>
                      </p>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 w-full">
                      <Button
                        className="h-12 w-full rounded-2xl font-bold shadow-lg shadow-primary/20"
                        onClick={() => navigate("/")}
                      >
                        Go to Dashboard
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {step === 1 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to UniMart's{" "}
            <span className="cursor-pointer text-primary hover:underline">Terms</span> &{" "}
            <span className="cursor-pointer text-primary hover:underline">Privacy Policy</span>
          </p>
        )}
      </div>
    </div>
  );
}
