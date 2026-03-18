import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (!reference) {
      setStatus("failed");
      return;
    }

    const verifyPayment = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("paystack-verify", {
          body: { reference },
        });

        if (error || !data?.success) {
          setStatus("failed");
          return;
        }

        setOrderId(data.order_id);
        setStatus("success");
      } catch {
        setStatus("failed");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <PageTransition>
      <div className="container mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            {status === "verifying" && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <h2 className="font-display text-xl font-bold">Verifying Payment...</h2>
                <p className="text-sm text-muted-foreground">Please wait while we confirm your transaction.</p>
              </>
            )}
            {status === "success" && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold">Payment Successful!</h2>
                <p className="text-sm text-muted-foreground">
                  Your order has been placed. You'll receive a QR code to show the seller when you receive your item.
                </p>
                <div className="flex gap-3">
                  {orderId && (
                    <Link to={`/order/${orderId}/qr`}>
                      <Button>View QR Code</Button>
                    </Link>
                  )}
                  <Button variant="outline" onClick={() => navigate("/orders")}>My Orders</Button>
                </div>
              </>
            )}
            {status === "failed" && (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="font-display text-xl font-bold">Payment Failed</h2>
                <p className="text-sm text-muted-foreground">
                  Something went wrong. Please try again.
                </p>
                <Button onClick={() => navigate("/marketplace")}>Back to Marketplace</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default PaymentCallback;
