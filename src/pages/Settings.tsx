import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Lock, Bell, Trash2, LogOut, ChevronRight, Moon, Sun, Monitor, KeyRound, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

type Theme = "light" | "dark" | "system";

const Settings = () => {
  const { user, profile, setProfile } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [pinForm, setPinForm] = useState({ pin: "", confirm: "" });
  const [pinLoading, setPinLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "system";
  });

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      prefersDark ? root.classList.add("dark") : root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (passwordForm.newPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPass });
    setPasswordLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.pin.length !== 4 || !/^\d{4}$/.test(pinForm.pin)) {
      toast.error("PIN must be exactly 4 digits"); return;
    }
    if (pinForm.pin !== pinForm.confirm) {
      toast.error("PINs don't match"); return;
    }
    setPinLoading(true);
    const { error } = await supabase.from("profiles").update({ payment_pin: pinForm.pin }).eq("user_id", user!.id);
    setPinLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Wallet PIN saved!"); setPinForm({ pin: "", confirm: "" }); }
  };

  const handleDeleteAccount = async () => {    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );
    if (!confirmed) return;
    toast.error("Please contact support to delete your account.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account preferences</p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Account */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <User className="h-4 w-4 text-primary" /> Account
          </div>
          <Separator />
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Username</p>
            <p className="text-sm font-medium">@{profile?.username}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/profile")}>
            Edit Profile <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </section>

        {/* Appearance */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <Sun className="h-4 w-4 text-primary" /> Appearance
          </div>
          <Separator />
          <div className="flex gap-2">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
                  theme === t ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                {t === "light" && <Sun className="h-3.5 w-3.5" />}
                {t === "dark" && <Moon className="h-3.5 w-3.5" />}
                {t === "system" && <Monitor className="h-3.5 w-3.5" />}
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Notifications */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <Bell className="h-4 w-4 text-primary" /> Notifications
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Push Notifications</p>
              <p className="text-xs text-muted-foreground">Receive alerts for orders and messages</p>
            </div>
            <Switch checked={notifEnabled} onCheckedChange={setNotifEnabled} />
          </div>
        </section>

        {/* Security */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <Lock className="h-4 w-4 text-primary" /> Security
          </div>
          <Separator />
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <Label htmlFor="newPass">New Password</Label>
              <Input
                id="newPass"
                type="password"
                placeholder="Min. 6 characters"
                value={passwordForm.newPass}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPass: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="confirmPass">Confirm Password</Label>
              <Input
                id="confirmPass"
                type="password"
                placeholder="Repeat new password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
              />
            </div>
            <Button type="submit" size="sm" disabled={passwordLoading || !passwordForm.newPass}>
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </section>

        {/* Wallet PIN */}
        <section className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Wallet PIN
          </div>
          <Separator />
          <p className="text-xs text-muted-foreground">Set a 4-digit PIN to authorize wallet payments at checkout.</p>
          <form onSubmit={handleSavePin} className="space-y-3">
            <div>
              <Label htmlFor="walletPin">New PIN (4 digits)</Label>
              <Input
                id="walletPin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pinForm.pin}
                onChange={(e) => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              />
            </div>
            <div>
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pinForm.confirm}
                onChange={(e) => setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              />
            </div>
            <Button type="submit" size="sm" disabled={pinLoading || pinForm.pin.length < 4}>
              {pinLoading ? "Saving..." : "Save PIN"}
            </Button>
          </form>
        </section>

        {/* Danger Zone */}
        <section className="rounded-xl border border-destructive/30 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <Trash2 className="h-4 w-4" /> Danger Zone
          </div>
          <Separator />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
            <Button variant="outline" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={handleDeleteAccount}>
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
