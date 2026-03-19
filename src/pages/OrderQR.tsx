import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, ShieldCheck, Clock } from "lucide-react";

const OrderQR = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-qr", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id!)
        .single();
      if (!data) return null;
      const { data: listing } = await supabase
        .from("listings")
        .select("title, images")
        .eq("id", data.listing_id!)
        .single();
      return { ...data, listing };
    },
    enabled: !!id && !!user,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-4xl">😕</p>
        <p className="mt-2 text-lg">Order not found</p>
        <Button className="mt-4" onClick={() => navigate("/orders")}>Back to Orders</Button>
      </div>
    );
  }

  const qrValue = JSON.stringify({
    orderId: order.id,
    token: order.qr_token,
    amount: order.amount,
  });

  return (
    <PageTransition>
      <div className="container mx-auto max-w-md px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="fixed left-4 top-20 z-40 gap-1 rounded-full bg-card/80 shadow-md backdrop-blur border">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <Card className="overflow-hidden">
          <CardHeader className="bg-primary pb-6 text-center text-primary-foreground">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-xl">Delivery QR Code</CardTitle>
            <p className="text-sm text-primary-foreground/80">
              Show this to the seller when you receive your item
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 p-6">
            <div className="rounded-2xl border-4 border-primary/10 bg-card p-4 shadow-lg">
              <QRCodeSVG
                value={qrValue}
                size={220}
                level="H"
                fgColor="hsl(120, 56%, 20%)"
                includeMargin
              />
            </div>

            <div className="w-full space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item</span>
                <span className="font-medium">{order.listing?.title || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-primary">₦{Number(order.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary">{order.status}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {order.status === "paid" && (
              <p className="text-center text-sm text-muted-foreground">
                ⚠️ Do not share this QR code until you've received your item. The seller will scan it to confirm delivery.
              </p>
            )}

            {order.status === "delivered" && (
              <div className="w-full rounded-lg bg-primary/10 p-3 text-center text-sm text-primary">
                ✅ Delivery confirmed! Payment released to seller.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default OrderQR;
