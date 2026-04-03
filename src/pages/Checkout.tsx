import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, CreditCard, Wallet, Loader2, KeyRound } from "lucide-react";

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  const [payMethod, setPayMethod] = useState<"wallet" | "paystack">("wallet");
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [paystackLoading, setPaystackLoading] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["checkout-listing", id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", id!).single();
      if (!data) return null;
      const { data: seller } = await supabase.from("profiles").select("full_name").eq("user_id", data.seller_id).single();
      return { ...data, seller_name: seller?.full_name };
    },
    enabled: !!id,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("seller_wallets").select("balance").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Create order helper
  const createOrder = async () => {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        buyer_id: user!.id,
        seller_id: listing!.seller_id,
        listing_id: listing!.id,
        amount: listing!.price,
        status: "pending" as any,
      })
      .select()
      .single();
    if (error) throw error;
    return order;
  };

  // Wallet payment with PIN
  const handleWalletPay = async () => {
    if (!pin || pin.length < 4) { toast.error("Enter your 4-digit PIN"); return; }
    if (!user || !listing || !wallet) return;

    setPinLoading(true);
    try {
      // Verify PIN
      const { data: profileData } = await supabase
        .from("profiles")
        .select("payment_pin")
        .eq("user_id", user.id)
        .single();

      if (!profileData?.payment_pin) {
        toast.error("No PIN set. Please set a wallet PIN in Settings first.");
        setPinLoading(false);
        setPinOpen(false);
        return;
      }

      if (profileData.payment_pin !== pin) {
        toast.error("Incorrect PIN");
        setPin("");
        setPinLoading(false);
        return;
      }

      const balance = Number(wallet.balance);
      if (balance < listing.price) {
        toast.error(`Insufficient wallet balance. You have ₦${balance.toLocaleString()}`);
        setPinLoading(false);
        setPinOpen(false);
        return;
      }

      // Deduct from buyer wallet
      const { error: deductErr } = await supabase
        .from("seller_wallets")
        .update({ balance: balance - listing.price })
        .eq("user_id", user.id);
      if (deductErr) throw deductErr;

      // Create order as paid
      const order = await createOrder();
      await supabase.from("orders").update({ status: "paid" as any, payment_reference: `wallet_${Date.now()}` }).eq("id", order.id);

      toast.success("Payment successful!");
      setPinOpen(false);
      navigate(`/order/${order.id}/qr`);
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
    }
    setPinLoading(false);
  };

  // Paystack payment
  const handlePaystackPay = async () => {
    if (!user || !listing) return;
    if (user.id === listing.seller_id) { toast.error("You can't buy your own item"); return; }

    setPaystackLoading(true);
    try {
      const order = await createOrder();
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          email: user.email,
          amount: listing.price * 100,
          orderId: order.id,
          metadata: { order_id: order.id, listing_title: listing.title, buyer_id: user.id, seller_id: listing.seller_id },
        },
      });
      if (error || !data?.data?.authorization_url) throw new Error(error?.message || "Payment initialization failed");
      window.location.href = data.data.authorization_url;
    } catch (err: any) {
      toast.error(err.message);
      setPaystackLoading(false);
    }
  };

  if (!user) { navigate("/login"); return null; }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Skeleton className="h-8 w-32" />
        <Card className="mt-6"><CardContent className="p-6 space-y-4">
          <Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-full" />
        </CardContent></Card>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-4xl">😕</p>
        <p className="mt-2">Listing not found</p>
        <Button className="mt-4" onClick={() => navigate("/marketplace")}>Back to Marketplace</Button>
      </div>
    );
  }

  const walletBalance = Number(wallet?.balance || 0);
  const hasEnoughBalance = walletBalance >= listing.price;

  return (
    <PageTransition>
      <div className="container mx-auto max-w-md px-4 py-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="fixed left-4 top-4 z-40 rounded-full bg-card/80 shadow-md backdrop-blur border">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <h1 className="font-display text-2xl font-bold">Checkout</h1>
        <p className="text-sm text-muted-foreground">Complete your purchase securely</p>

        {/* Item Summary */}
        <div className="mt-6 flex items-center gap-4 rounded-2xl border bg-muted/40 p-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
            {listing.images[0]
              ? <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
              : <div className="flex h-full items-center justify-center text-2xl">📦</div>}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-semibold">{listing.title}</p>
            <p className="text-xs text-muted-foreground">Seller: {listing.seller_name}</p>
            <p className="mt-1 font-bold text-primary">₦{Number(listing.price).toLocaleString()}</p>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPayMethod("wallet")}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${payMethod === "wallet" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}
            >
              <Wallet className={`h-6 w-6 ${payMethod === "wallet" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Wallet</span>
              <span className={`text-xs ${hasEnoughBalance ? "text-primary" : "text-destructive"}`}>
                ₦{walletBalance.toLocaleString()}
              </span>
            </button>
            <button
              onClick={() => setPayMethod("paystack")}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${payMethod === "paystack" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/50"}`}
            >
              <CreditCard className={`h-6 w-6 ${payMethod === "paystack" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">Card / Bank</span>
              <span className="text-xs text-muted-foreground">via Paystack</span>
            </button>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="mt-6 space-y-2 rounded-2xl border bg-card p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Item Price</span>
            <span>₦{Number(listing.price).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Escrow Fee</span>
            <span className="text-primary">Free</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">₦{Number(listing.price).toLocaleString()}</span>
          </div>
        </div>

        {/* Escrow Info */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/5 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Your payment is held in escrow. The seller only gets paid after you confirm delivery with a QR code.
          </p>
        </div>

        {/* Pay Button */}
        {payMethod === "wallet" ? (
          <Button
            className="mt-6 w-full gap-2" size="lg"
            onClick={() => { setPin(""); setPinOpen(true); }}
            disabled={!hasEnoughBalance}
          >
            <Wallet className="h-4 w-4" />
            {hasEnoughBalance ? `Pay ₦${Number(listing.price).toLocaleString()} from Wallet` : "Insufficient Balance"}
          </Button>
        ) : (
          <Button
            className="mt-6 w-full gap-2" size="lg"
            onClick={handlePaystackPay}
            disabled={paystackLoading}
          >
            {paystackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {paystackLoading ? "Redirecting..." : `Pay ₦${Number(listing.price).toLocaleString()} via Paystack`}
          </Button>
        )}

        {payMethod === "wallet" && !hasEnoughBalance && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <button className="text-primary underline" onClick={() => navigate("/wallet")}>Top up your wallet</button> to use this method.
          </p>
        )}
      </div>

      {/* PIN Dialog */}
      <Dialog open={pinOpen} onOpenChange={(o) => { setPinOpen(o); setPin(""); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Enter Wallet PIN
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter your 4-digit wallet PIN to confirm payment of <span className="font-semibold text-foreground">₦{Number(listing.price).toLocaleString()}</span>.
            </p>
            <div>
              <Label>PIN</Label>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 text-center text-2xl tracking-[0.5em]"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              No PIN set?{" "}
              <button className="text-primary underline" onClick={() => { setPinOpen(false); navigate("/settings"); }}>
                Set one in Settings
              </button>
            </p>
            <Button className="w-full" onClick={handleWalletPay} disabled={pinLoading || pin.length < 4}>
              {pinLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {pinLoading ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

export default Checkout;
