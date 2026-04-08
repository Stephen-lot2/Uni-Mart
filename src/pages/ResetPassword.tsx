import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, KeyRound, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash — getSession picks it up automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      else {
        toast.error("Invalid or expired reset link. Please request a new one.");
        navigate("/forgot-password");
      }
    });
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords don't match"); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { toast.error(error.message); return; }

    toast.success("Password updated! Please sign in.");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!validSession) return null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* badge */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3 w-3" /> Campus Marketplace
          </span>
        </div>

        {/* logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-primary blur-xl opacity-40" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary/70 shadow-2xl shadow-primary/40">
              <span className="font-display text-4xl font-black text-primary-foreground">U</span>
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-display text-3xl font-black tracking-tight">CampusMart</h1>
            <p className="text-sm text-muted-foreground">Your campus, your marketplace</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-2xl backdrop-blur-xl">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />
          <div className="p-8">
            <div className="mb-7">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold">Set new password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
            </div>

            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">New password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-2xl border-border/50 bg-muted/40 px-4 pr-12 text-sm focus-visible:ring-2 focus-visible:ring-primary/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-semibold">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-12 rounded-2xl border-border/50 bg-muted/40 px-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/50"
                  required
                />
              </div>

              {/* strength hint */}
              {password.length > 0 && (
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= i * 3
                          ? password.length >= 10 ? "bg-green-500" : password.length >= 6 ? "bg-yellow-500" : "bg-red-400"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="h-12 w-full gap-2 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]"
                disabled={loading || password.length < 6 || password !== confirm}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</>
                  : <><KeyRound className="h-4 w-4" /> Update password</>}
              </Button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;

