import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HandCoins, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  askingPrice: number;
}

export function MakeOffer({ listingId, sellerId, listingTitle, askingPrice }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const suggestions = [
    Math.round(askingPrice * 0.9),
    Math.round(askingPrice * 0.8),
    Math.round(askingPrice * 0.7),
  ];

  const handleSend = async () => {
    const amount = parseFloat(offerPrice);
    if (!amount || amount <= 0) { toast.error("Enter a valid offer amount"); return; }
    if (!user) { navigate("/login"); return; }

    setLoading(true);
    try {
      // Find or create conversation
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant_one.eq.${user.id},participant_two.eq.${sellerId}),and(participant_one.eq.${sellerId},participant_two.eq.${user.id})`)
        .eq("listing_id", listingId)
        .maybeSingle();

      let convoId = existing?.id;

      if (!convoId) {
        const { data: newConvo, error } = await supabase
          .from("conversations")
          .insert({ participant_one: user.id, participant_two: sellerId, listing_id: listingId })
          .select()
          .single();
        if (error) throw error;
        convoId = newConvo.id;
      }

      // Send offer as a special message
      const offerText = `[offer]💰 Offer: ₦${amount.toLocaleString()} for "${listingTitle}"${note ? `\n📝 ${note}` : ""}[/offer]`;
      const { error: msgErr } = await supabase.from("messages").insert({
        conversation_id: convoId,
        sender_id: user.id,
        content: offerText,
      });
      if (msgErr) throw msgErr;

      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);
      queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });

      toast.success("Offer sent! The seller will reply in chat.");
      setOpen(false);
      setOfferPrice("");
      setNote("");

      // Navigate to the chat
      navigate(`/chat?conversation=${convoId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send offer");
    }
    setLoading(false);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-2 flex-1">
        <HandCoins className="h-4 w-4" /> Make Offer
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
                  <HandCoins size={22} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">Make an Offer</h2>
                  <p className="text-sm text-muted-foreground">
                    Asking price: <span className="font-semibold text-foreground">₦{askingPrice.toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Quick suggestions */}
              <div className="mb-4">
                <p className="mb-2 text-xs text-muted-foreground">Quick suggestions</p>
                <div className="flex gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setOfferPrice(String(s))}
                      className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                        offerPrice === String(s) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                      }`}
                    >
                      ₦{s.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div className="mb-4">
                <Label>Your offer (₦)</Label>
                <Input
                  type="number"
                  placeholder={`e.g. ${Math.round(askingPrice * 0.85).toLocaleString()}`}
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="mt-1 h-12 rounded-2xl text-base"
                  autoFocus
                />
              </div>

              {/* Optional note */}
              <div className="mb-5">
                <Label>Note to seller <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input
                  placeholder="e.g. Can you do ₦3,500? I'll pick up today."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={120}
                  className="mt-1 rounded-2xl"
                />
              </div>

              <Button className="h-12 w-full rounded-2xl text-base font-semibold" onClick={handleSend} disabled={loading || !offerPrice}>
                {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <HandCoins size={18} className="mr-2" />}
                {loading ? "Sending..." : "Send Offer"}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
