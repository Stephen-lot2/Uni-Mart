import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const BOOST_PLANS = [
  { days: 3,  price: 200,  label: "3 Days",  popular: false },
  { days: 7,  price: 400,  label: "7 Days",  popular: true  },
  { days: 14, price: 700,  label: "14 Days", popular: false },
];

interface Props {
  listingId: string;
  isFeatured: boolean;
}

export function BoostListing({ listingId, isFeatured }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(1); // index into BOOST_PLANS
  const [loading, setLoading] = useState(false);

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("seller_wallets").select("balance").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user && open,
  });

  const handleBoost = async () => {
    const plan = BOOST_PLANS[selected];
    const balance = Number(wallet?.balance || 0);

    if (balance < plan.price) {
      toast.error(`Insufficient wallet balance. You need ₦${plan.price.toLocaleString()}.`);
      return;
    }

    setLoading(true);
    try {
      // Deduct from wallet
      const { error: walletErr } = await supabase
        .from("seller_wallets")
        .update({ balance: balance - plan.price })
        .eq("user_id", user!.id);
      if (walletErr) throw walletErr;

      // Mark listing as featured
      const { error: listingErr } = await supabase
        .from("listings")
        .update({ is_featured: true })
        .eq("id", listingId);
      if (listingErr) throw listingErr;

      queryClient.invalidateQueries({ queryKey: ["listing", listingId] });
      queryClient.invalidateQueries({ queryKey: ["wallet", user!.id] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["user-listings"] });

      toast.success(`🚀 Listing boosted for ${plan.label}!`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Boost failed");
    }
    setLoading(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={`gap-1.5 rounded-xl ${isFeatured ? "border-primary/50 text-primary" : ""}`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        {isFeatured ? "Boosted" : "Boost"}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-card px-6 pb-10 pt-6 shadow-2xl"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
              <button onClick={() => setOpen(false)} className="absolute right-5 top-5 rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                <X size={18} />
              </button>

              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Zap size={22} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">Boost Your Listing</h2>
                  <p className="text-sm text-muted-foreground">Pin to the top of the marketplace</p>
                </div>
              </div>

              {/* Wallet balance */}
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-muted/50 px-4 py-3 text-sm">
                <span className="text-muted-foreground">Wallet balance</span>
                <span className="font-bold text-foreground">₦{Number(wallet?.balance || 0).toLocaleString()}</span>
              </div>

              {/* Plans */}
              <div className="mb-5 grid grid-cols-3 gap-3">
                {BOOST_PLANS.map((plan, i) => (
                  <button
                    key={plan.days}
                    onClick={() => setSelected(i)}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 py-4 transition-all ${
                      selected === i ? "border-primary bg-primary/5" : "border-border hover:border-border/80"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                        Popular
                      </span>
                    )}
                    <span className="text-sm font-bold text-foreground">{plan.label}</span>
                    <span className={`text-xs font-semibold ${selected === i ? "text-primary" : "text-muted-foreground"}`}>
                      ₦{plan.price.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>

              <Button className="h-12 w-full rounded-2xl text-base font-semibold" onClick={handleBoost} disabled={loading}>
                {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Sparkles size={18} className="mr-2" />}
                {loading ? "Boosting..." : `Boost for ₦${BOOST_PLANS[selected].price.toLocaleString()}`}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Charged from your wallet. <button className="text-primary underline" onClick={() => { setOpen(false); window.location.href = "/wallet"; }}>Top up</button>
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
