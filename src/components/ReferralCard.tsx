import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Copy, Check, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

const REFERRAL_REWARD = 200; // ₦ credited to both parties

export function ReferralCard() {
  const { user, profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");

  // Referral code = username (unique, already exists)
  const referralCode = profile?.username?.toUpperCase() || "";
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const { data: referralCount } = useQuery({
    queryKey: ["referral-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: alreadyUsed } = useQuery({
    queryKey: ["referral-used", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied!");
  };

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join CampusMart",
        text: `Use my referral code ${referralCode} on CampusMart and we both get ₦${REFERRAL_REWARD}!`,
        url: referralLink,
      });
    } else {
      navigator.clipboard.writeText(referralLink);
      toast.success("Link copied!");
    }
  };

  const applyReferral = useMutation({
    mutationFn: async () => {
      if (!inputCode.trim()) throw new Error("Enter a referral code");
      if (inputCode.trim().toUpperCase() === referralCode) throw new Error("You can't use your own code");

      // Find referrer by username
      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", inputCode.trim().toLowerCase())
        .maybeSingle();

      if (!referrer) throw new Error("Invalid referral code");

      // Insert referral record
      const { error: refErr } = await supabase.from("referrals").insert({
        referrer_id: referrer.user_id,
        referred_id: user!.id,
      });
      if (refErr) {
        if (refErr.code === "23505") throw new Error("You've already used a referral code");
        throw refErr;
      }

      // Credit both wallets
      const creditWallet = async (uid: string) => {
        const { data: w } = await supabase.from("seller_wallets").select("balance").eq("user_id", uid).single();
        const current = Number(w?.balance || 0);
        await supabase.from("seller_wallets").upsert({ user_id: uid, balance: current + REFERRAL_REWARD }, { onConflict: "user_id" });
      };

      await Promise.all([creditWallet(user!.id), creditWallet(referrer.user_id)]);
    },
    onSuccess: () => {
      toast.success(`🎉 ₦${REFERRAL_REWARD} added to your wallet!`);
      setInputCode("");
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["referral-used", user?.id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">Refer & Earn</p>
          <p className="text-xs text-muted-foreground">
            You and your friend each get <span className="font-semibold text-primary">₦{REFERRAL_REWARD}</span>
          </p>
        </div>
        {referralCount !== undefined && referralCount > 0 && (
          <span className="ml-auto text-xs font-semibold text-primary bg-primary/10 rounded-full px-2.5 py-1">
            {referralCount} referral{referralCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Your code */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Your referral code</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center rounded-xl border bg-muted/40 px-4 font-mono text-sm font-bold tracking-widest text-foreground h-10">
            {referralCode}
          </div>
          <Button size="icon" variant="outline" onClick={copyCode} className="h-10 w-10 rounded-xl shrink-0">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="outline" onClick={shareLink} className="h-10 w-10 rounded-xl shrink-0">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Apply a code */}
      {!alreadyUsed && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Have a friend's code?</p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="h-10 rounded-xl font-mono tracking-widest text-sm uppercase"
              maxLength={20}
            />
            <Button
              size="sm"
              onClick={() => applyReferral.mutate()}
              disabled={applyReferral.isPending || !inputCode.trim()}
              className="h-10 rounded-xl px-4 shrink-0"
            >
              {applyReferral.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        </div>
      )}
      {alreadyUsed && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Check className="h-3.5 w-3.5 text-primary" /> Referral code already applied
        </p>
      )}
    </div>
  );
}

