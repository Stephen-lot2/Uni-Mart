import { useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, ShieldCheck, Clock, Download } from "lucide-react";
import { toast } from "sonner";

const OrderQR = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const hiddenCanvasRef = useRef<HTMLDivElement>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-qr", id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("id", id!).single();
      if (!data) return null;
      const { data: listing } = await supabase.from("listings").select("title, images").eq("id", data.listing_id!).single();
      return { ...data, listing };
    },
    enabled: !!id && !!user,
  });

  const downloadCard = () => {
    // Grab the hidden QRCodeCanvas element
    const qrCanvas = hiddenCanvasRef.current?.querySelector("canvas");
    if (!qrCanvas || !order) { toast.error("Could not generate download"); return; }

    const W = 480, H = 640;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Header band
    const grad = ctx.createLinearGradient(0, 0, W, 80);
    grad.addColorStop(0, "#166534");
    grad.addColorStop(1, "#15803d");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 110);

    // Header text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("UniMart", W / 2, 42);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("Delivery QR Code", W / 2, 68);
    ctx.font = "12px sans-serif";
    ctx.fillText("Show this to the seller when you receive your item", W / 2, 92);

    // QR code (centered)
    const qrSize = 240;
    const qrX = (W - qrSize) / 2;
    const qrY = 130;

    // White rounded rect behind QR
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.roundRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32, 16);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

    // Order details box
    const boxY = qrY + qrSize + 36;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.roundRect(24, boxY, W - 48, 160, 12);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.stroke();

    const rows = [
      ["Item", order.listing?.title || "—"],
      ["Amount", `₦${Number(order.amount).toLocaleString()}`],
      ["Status", order.status.charAt(0).toUpperCase() + order.status.slice(1)],
      ["Date", new Date(order.created_at).toLocaleDateString()],
    ];

    rows.forEach(([label, value], i) => {
      const rowY = boxY + 28 + i * 34;
      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.textAlign = "left";
      ctx.fillText(label, 44, rowY);
      ctx.font = i === 1 ? "bold 14px sans-serif" : "14px sans-serif";
      ctx.fillStyle = i === 1 ? "#166534" : "#0f172a";
      ctx.textAlign = "right";
      ctx.fillText(value, W - 44, rowY);
      if (i < rows.length - 1) {
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(44, rowY + 10); ctx.lineTo(W - 44, rowY + 10);
        ctx.stroke();
      }
    });

    // Footer note
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText("⚠️ Do not share until you've received your item", W / 2, H - 20);

    // Download
    const link = document.createElement("a");
    link.download = `unimart-order-${order.id.slice(0, 8)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR card downloaded");
  };

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

  const qrValue = JSON.stringify({ orderId: order.id, token: order.qr_token, amount: order.amount });

  return (
    <PageTransition>
      {/* Hidden canvas-based QR for download */}
      <div ref={hiddenCanvasRef} className="hidden">
        <QRCodeCanvas value={qrValue} size={240} level="H" fgColor="#166534" includeMargin />
      </div>

      <div className="container mx-auto max-w-md px-4 py-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="fixed left-4 top-4 z-40 rounded-full bg-card/80 shadow-md backdrop-blur border">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Card className="overflow-hidden">
          <CardHeader className="bg-primary pb-6 text-center text-primary-foreground">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-xl">Delivery QR Code</CardTitle>
            <p className="text-sm text-primary-foreground/80">Show this to the seller when you receive your item</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 p-6">
            <div className="rounded-2xl border-4 border-primary/10 bg-card p-4 shadow-lg">
              <QRCodeSVG value={qrValue} size={220} level="H" fgColor="hsl(120, 56%, 20%)" includeMargin />
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

            <Button className="w-full gap-2" variant="outline" onClick={downloadCard}>
              <Download className="h-4 w-4" /> Download QR Card
            </Button>

            {order.status === "paid" && (
              <p className="text-center text-sm text-muted-foreground">
                ⚠️ Do not share this QR code until you've received your item.
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
