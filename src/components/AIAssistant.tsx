import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "What's selling fast this week?",
  "How do I boost my listing?",
  "How does escrow work?",
  "How do I earn referral credit?",
];

// Simple rule-based AI using listing data from Supabase
async function getAIResponse(message: string, userId?: string): Promise<string> {
  const q = message.toLowerCase();

  // Fetch context from DB for smart answers
  if (q.includes("sell") && (q.includes("fast") || q.includes("popular") || q.includes("trending"))) {
    const { data } = await supabase
      .from("listings")
      .select("category, title")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data?.length) {
      const counts: Record<string, number> = {};
      data.forEach(l => { counts[l.category] = (counts[l.category] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const labels: Record<string, string> = {
        electronics: "Electronics 💻", books: "Books 📚", fashion: "Fashion 👕",
        hostel_items: "Hostel Items 🏠", school_supplies: "School Supplies ✏️", services: "Services 🔧",
      };
      return `Right now the hottest categories on CampusMart are:\n\n${top.map(([k, v], i) => `${i + 1}. ${labels[k] || k} — ${v} active listings`).join("\n")}\n\nElectronics and books tend to move the fastest. Price competitively and add clear photos to sell quicker!`;
    }
  }

  if (q.includes("boost") || q.includes("feature") || q.includes("pin")) {
    return "To boost a listing, open it and tap the ✨ Boost button. Choose a plan:\n\n• 3 Days — ₦200\n• 7 Days — ₦400 (most popular)\n• 14 Days — ₦700\n\nBoosted listings appear in the Featured section at the top of the marketplace. The fee is deducted from your wallet.";
  }

  if (q.includes("escrow") || q.includes("payment") || q.includes("safe")) {
    return "CampusMart uses escrow to protect both buyers and sellers:\n\n1. Buyer pays → funds are held securely\n2. Seller delivers the item\n3. Buyer scans the seller's QR code to confirm delivery\n4. Funds are released to the seller's wallet\n\nIf there's a dispute, our admin team reviews it. Never pay outside the app!";
  }

  if (q.includes("referral") || q.includes("invite") || q.includes("earn")) {
    return "The referral system is simple:\n\n1. Go to your Profile page\n2. Copy your unique referral code\n3. Share it with friends\n4. When they sign up using your code, you both get ₦200 in your wallets!\n\nYou can also share a direct link via WhatsApp or any app using the Share button.";
  }

  if (q.includes("wallet") || q.includes("withdraw") || q.includes("deposit")) {
    return "Your CampusMart wallet lets you:\n\n• Deposit funds via Paystack (card or bank transfer)\n• Pay for items instantly without entering card details each time\n• Receive earnings from sales\n• Withdraw to your bank account\n\nGo to Wallet in the menu to get started. Minimum deposit is ₦100.";
  }

  if (q.includes("sell") || q.includes("list") || q.includes("create listing")) {
    return "Listing an item is free and takes under a minute:\n\n1. Tap the + Sell button in the navbar\n2. Add photos (up to 5), title, price, and description\n3. Choose category and condition\n4. Hit Publish!\n\nTips for faster sales:\n• Use clear, bright photos\n• Price slightly below market value\n• Add your location on campus\n• Boost the listing for more visibility";
  }

  if (q.includes("offer") || q.includes("negotiate") || q.includes("price")) {
    return "You can negotiate prices using the Make Offer feature:\n\n1. Open any listing\n2. Tap Make Offer\n3. Enter your price (quick suggestions are shown)\n4. Add an optional note to the seller\n5. The offer is sent as a chat message\n\nThe seller can accept, counter, or decline in the chat.";
  }

  if (q.includes("follow") || q.includes("seller") || q.includes("notify")) {
    return "You can follow any seller on CampusMart:\n\n1. Visit their profile page\n2. Tap the Follow button\n3. You'll get a push notification whenever they post a new listing\n\nThis is great for following sellers who regularly post items you're interested in!";
  }

  if (q.includes("order") || q.includes("delivery") || q.includes("qr")) {
    return "Here's how orders work on CampusMart:\n\n1. Buy an item → order is created\n2. Meet the seller on campus\n3. Seller shows their QR code\n4. You scan it to confirm delivery\n5. Payment is released to the seller\n\nYou can view all your orders under the Orders section in the menu.";
  }

  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("help")) {
    return "Hey! 👋 I'm the CampusMart AI assistant. I can help you with:\n\n• Finding what's trending on campus\n• How to sell or buy items\n• Understanding escrow & payments\n• Boosting your listings\n• Referrals & earning credit\n• Following sellers\n\nWhat would you like to know?";
  }

  if (q.includes("leaderboard") || q.includes("top seller")) {
    return "The Campus Leaderboard shows the top 5 sellers by completed orders in the last 30 days. You can find it on the home page or click Leaderboard in the navbar.\n\nTo climb the leaderboard:\n• List quality items at fair prices\n• Respond quickly to messages\n• Complete orders promptly\n• Collect good reviews";
  }

  // Fallback
  return "I'm not sure about that specific question, but I'm here to help with anything CampusMart-related — buying, selling, payments, listings, referrals, and more. Try asking something like:\n\n• \"How do I sell an item?\"\n• \"How does escrow work?\"\n• \"How do I earn referral credit?\"";
}

export function AIAssistant() {
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey! 👋 I'm your CampusMart AI assistant. Ask me anything about buying, selling, payments, or how the platform works!" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setLoading(true);
    const reply = await getAIResponse(msg, user?.id);
    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 text-primary-foreground md:bottom-8 md:right-6"
            aria-label="Open AI Assistant"
          >
            <Sparkles className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl md:bottom-8 md:right-6"
            style={{ height: "min(520px, calc(100vh - 120px))" }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b bg-primary px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/20">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-primary-foreground">CampusMart AI</p>
                <p className="text-[11px] text-primary-foreground/70">Always here to help</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-primary-foreground/70 hover:bg-primary-foreground/10 transition-colors">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "assistant" && (
                    <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {messages.length <= 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="shrink-0 rounded-full border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t p-3 flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask me anything..."
                className="h-10 rounded-full bg-muted border-none text-sm focus-visible:ring-1"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="h-10 w-10 rounded-full shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
