import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };

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
            <h1 className="font-display text-3xl font-black tracking-tight">UniMart</h1>
            <p className="text-sm text-muted-foreground">Your campus, your marketplace</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-2xl backdrop-blur-xl">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />
          <div className="p-8">
            {!sent ? (
              <>
                <div className="mb-7">
                  <h2 className="font-display text-2xl font-bold">Forgot password?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter your email and we'll send you a reset link.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@student.edu.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 rounded-2xl border-border/50 bg-muted/40 px-4 text-sm focus-visible:ring-2 focus-visible:ring-primary/50"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full gap-2 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.99]"
                    disabled={loading}
                  >
                    {loading
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                      : <><Mail className="h-4 w-4" /> Send reset link</>}
                  </Button>
                </form>
              </>
            ) : (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold">Check your inbox</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  We sent a password reset link to<br />
                  <span className="font-semibold text-foreground">{email}</span>
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Didn't get it? Check your spam folder or{" "}
                  <button onClick={() => setSent(false)} className="text-primary hover:underline">
                    try again
                  </button>
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Link to="/login" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
