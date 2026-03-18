import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, CreditCard, Loader2 } from "lucide-react";

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);

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

  const initializePayment = useMutation({
    mutationFn: async () => {
      if (!user || !listing) throw new Error("Missing data");
      if (user.id === listing.seller_id) throw new Error("You can't buy your own item");

      setPaying(true);

      // Create order first
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          seller_id: listing.seller_id,
          listing_id: listing.id,
          amount: listing.price,
          status: "pending" as any,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Initialize Paystack payment via edge function
      const { data, error } = await supabase.functions.invoke("paystack-initialize", {
        body: {
          email: user.email,
          amount: listing.price * 100, // Paystack uses kobo
          orderId: order.id,
          metadata: {
            order_id: order.id,
            listing_title: listing.title,
            buyer_id: user.id,
            seller_id: listing.seller_id,
          },
        },
      });

      if (error) throw error;
      if (!data?.authorization_url) throw new Error("Payment initialization failed");

      // Redirect to Paystack
      window.location.href = data.authorization_url;
    },
    onError: (error: Error) => {
      setPaying(false);
      toast.error(error.message);
    },
  });

  if (!user) { navigate("/login"); return null; }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-md px-4 py-8">
        <Skeleton className="h-8 w-32" />
        <Card className="mt-6"><CardContent className="p-6 space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
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

  return (
    <PageTransition>
      <div className="container mx-auto max-w-md px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h1 className="font-display text-2xl font-bold">Checkout</h1>
        <p className="text-sm text-muted-foreground">Secure payment via Paystack</p>

        <Card className="mt-6">
          <CardContent className="p-6">
            {/* Item Summary */}
            <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {listing.images[0] ? (
                  <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">📦</div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold">{listing.title}</p>
                <p className="text-xs text-muted-foreground">Seller: {listing.seller_name}</p>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item Price</span>
                <span>₦{listing.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Escrow Fee</span>
                <span className="text-primary">Free</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">₦{listing.price.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Escrow Info */}
            <div className="mt-6 rounded-lg bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Escrow Protection</p>
                  <p className="text-xs text-muted-foreground">
                    Your payment is held securely. The seller only gets paid after you confirm delivery with a QR code.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="mt-6 w-full gap-2"
              size="lg"
              onClick={() => initializePayment.mutate()}
              disabled={paying}
            >
              {paying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {paying ? "Processing..." : `Pay ₦${listing.price.toLocaleString()}`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default Checkout;
