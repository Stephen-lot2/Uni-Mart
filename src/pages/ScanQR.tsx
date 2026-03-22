import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, QrCode, CheckCircle, Loader2 } from "lucide-react";

const ScanQR = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [manualToken, setManualToken] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const { data: order } = useQuery({
    queryKey: ["order-scan", id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", id!).single();
      if (!data) return null;
      const { data: listing } = await supabase.from("listings").select("title").eq("id", data.listing_id!).single();
      return { ...data, listing };
    },
    enabled: !!id && !!user,
  });

  const confirmDelivery = useMutation({
    mutationFn: async (token: string) => {
      // Verify QR token
      let parsedToken = token;
      try {
        const parsed = JSON.parse(token);
        parsedToken = parsed.token;
      } catch {
        // Raw token string
      }

      if (!order || parsedToken !== order.qr_token) {
        throw new Error("Invalid QR code. Please try again.");
      }

      // Update order status to delivered
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "delivered" as any })
        .eq("id", order.id);
      if (orderError) throw orderError;

      // Add amount to seller wallet
      const { data: wallet } = await supabase
        .from("seller_wallets")
        .select("balance")
        .eq("user_id", user!.id)
        .single();

      if (wallet) {
        await supabase
          .from("seller_wallets")
          .update({ balance: Number(wallet.balance) + Number(order.amount) })
          .eq("user_id", user!.id);
      } else {
        await supabase
          .from("seller_wallets")
          .insert({ user_id: user!.id, balance: Number(order.amount) });
      }
    },
    onSuccess: () => {
      setConfirmed(true);
      toast.success("Delivery confirmed! Funds added to your wallet.");
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleManualConfirm = () => {
    if (!manualToken.trim()) {
      toast.error("Please enter the QR code token");
      return;
    }
    confirmDelivery.mutate(manualToken);
  };

  if (confirmed) {
    return (
      <PageTransition>
        <div className="container mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">Delivery Confirmed!</h2>
          <p className="mt-2 text-muted-foreground">
            ₦{Number(order?.amount).toLocaleString()} has been added to your wallet.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate("/wallet")}>View Wallet</Button>
            <Button variant="outline" onClick={() => navigate("/orders")}>My Orders</Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto max-w-md px-4 py-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="fixed left-4 top-4 z-40 rounded-full bg-card/80 shadow-md backdrop-blur border">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-display">Confirm Delivery</CardTitle>
            <p className="text-sm text-muted-foreground">
              {order?.listing?.title && `Item: ${order.listing.title}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border bg-muted/50 p-4 text-center">
              <p className="text-sm text-muted-foreground">Amount to receive</p>
              <p className="text-2xl font-bold text-primary">₦{Number(order?.amount || 0).toLocaleString()}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Enter QR Code Token</p>
              <p className="text-xs text-muted-foreground">
                Ask the buyer to show their QR code. Enter the token manually or paste the scanned data.
              </p>
              <Input
                placeholder="Paste QR code data or token here..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
              />
              <Button
                className="w-full gap-2"
                onClick={handleManualConfirm}
                disabled={confirmDelivery.isPending}
              >
                {confirmDelivery.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Confirm Delivery
              </Button>
            </div>

            <div className="rounded-lg bg-secondary/10 p-3">
              <p className="text-xs text-muted-foreground">
                💡 <strong>How it works:</strong> The buyer has a QR code with a unique token. 
                When you confirm delivery using their token, the payment will be released to your wallet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ScanQR;
