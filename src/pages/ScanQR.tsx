import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, QrCode, CheckCircle, Loader2, Camera, CameraOff, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── QR Scanner using BarcodeDetector (Chrome/Edge/Android) ── */
function useQRScanner(onDetected: (data: string) => void, active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) return;

    let detector: any = null;
    let stopped = false;

    const start = async () => {
      try {
        // Check BarcodeDetector support
        if (!("BarcodeDetector" in window)) {
          setError("Camera scanning not supported in this browser. Use manual entry below.");
          return;
        }
        detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }

        const scan = async () => {
          if (stopped || !videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(scan);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
              return; // stop scanning after first hit
            }
          } catch {}
          rafRef.current = requestAnimationFrame(scan);
        };
        rafRef.current = requestAnimationFrame(scan);
      } catch (err: any) {
        if (err.name === "NotAllowedError") {
          setError("Camera permission denied. Allow camera access and try again.");
        } else {
          setError("Could not access camera. Use manual entry below.");
        }
      }
    };

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setReady(false);
      setError(null);
    };
  }, [active]);

  return { videoRef, error, ready };
}

const ScanQR = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [manualToken, setManualToken] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [scanning, setScanning] = useState(true); // camera active

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
    mutationFn: async (raw: string) => {
      let parsedToken = raw.trim();
      try {
        const parsed = JSON.parse(raw);
        parsedToken = parsed.token ?? parsedToken;
      } catch {}

      if (!order || parsedToken !== order.qr_token) {
        throw new Error("Invalid QR code. Please try again.");
      }

      const { error: orderError } = await supabase
        .from("orders").update({ status: "delivered" as any }).eq("id", order.id);
      if (orderError) throw orderError;

      const { data: wallet } = await supabase
        .from("seller_wallets").select("balance").eq("user_id", user!.id).single();

      if (wallet) {
        await supabase.from("seller_wallets")
          .update({ balance: Number(wallet.balance) + Number(order.amount) })
          .eq("user_id", user!.id);
      } else {
        await supabase.from("seller_wallets")
          .insert({ user_id: user!.id, balance: Number(order.amount) });
      }
    },
    onSuccess: () => {
      setScanning(false);
      setConfirmed(true);
      toast.success("Delivery confirmed! Funds added to your wallet.");
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (error: Error) => {
      setScanning(false); // stop camera, let user retry
      toast.error(error.message);
      setTimeout(() => setScanning(true), 1500); // restart scan after brief pause
    },
  });

  // Called when camera detects a QR code
  const handleDetected = (data: string) => {
    if (confirmDelivery.isPending || confirmed) return;
    setScanning(false); // pause camera
    confirmDelivery.mutate(data);
  };

  const { videoRef, error: cameraError, ready: cameraReady } = useQRScanner(
    handleDetected,
    mode === "camera" && scanning && !confirmed
  );

  const handleManualConfirm = () => {
    if (!manualToken.trim()) { toast.error("Enter the QR token"); return; }
    confirmDelivery.mutate(manualToken);
  };

  /* ── Success screen ── */
  if (confirmed) {
    return (
      <PageTransition>
        <div className="container mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold">Delivery Confirmed!</h2>
          <p className="mt-2 text-muted-foreground">
            <span className="font-bold text-primary text-lg">₦{Number(order?.amount).toLocaleString()}</span> has been added to your wallet.
          </p>
          <div className="mt-8 flex justify-center gap-3">
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
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}
          className="fixed left-4 top-4 z-40 rounded-full bg-card/80 shadow-md backdrop-blur border">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <Card className="overflow-hidden">
          <CardHeader className="bg-primary text-center text-primary-foreground pb-5">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/20">
              <QrCode className="h-6 w-6" />
            </div>
            <CardTitle className="font-display">Confirm Delivery</CardTitle>
            {order?.listing?.title && (
              <p className="text-sm text-primary-foreground/80 mt-1">{order.listing.title}</p>
            )}
          </CardHeader>

          <CardContent className="p-5 space-y-5">
            {/* Amount */}
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <p className="text-xs text-muted-foreground">Amount to receive</p>
              <p className="text-3xl font-black text-primary mt-0.5">₦{Number(order?.amount || 0).toLocaleString()}</p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl border overflow-hidden">
              <button
                onClick={() => { setMode("camera"); setScanning(true); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors",
                  mode === "camera" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <Camera className="h-4 w-4" /> Scan Camera
              </button>
              <button
                onClick={() => { setMode("manual"); setScanning(false); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors",
                  mode === "manual" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <Keyboard className="h-4 w-4" /> Manual Entry
              </button>
            </div>

            {/* ── CAMERA MODE ── */}
            {mode === "camera" && (
              <div className="space-y-3">
                {cameraError ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/30 p-6 text-center">
                    <CameraOff className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{cameraError}</p>
                    <Button variant="outline" size="sm" onClick={() => setMode("manual")}>
                      Switch to Manual Entry
                    </Button>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl bg-black aspect-square">
                    {/* Video feed */}
                    <video
                      ref={videoRef}
                      className="h-full w-full object-cover"
                      playsInline
                      muted
                    />

                    {/* Loading overlay */}
                    {!cameraReady && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                        <p className="text-sm text-white/70">Starting camera...</p>
                      </div>
                    )}

                    {/* Scanning overlay */}
                    {cameraReady && !confirmDelivery.isPending && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Corner brackets */}
                        <div className="relative h-52 w-52">
                          <span className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
                          <span className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
                          <span className="absolute left-0 bottom-0 h-8 w-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
                          <span className="absolute right-0 bottom-0 h-8 w-8 border-r-4 border-b-4 border-white rounded-br-lg" />
                          {/* Scan line animation */}
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-[scanline_2s_ease-in-out_infinite]" />
                        </div>
                      </div>
                    )}

                    {/* Processing overlay */}
                    {confirmDelivery.isPending && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-sm font-semibold text-white">Verifying...</p>
                      </div>
                    )}
                  </div>
                )}

                {cameraReady && !cameraError && (
                  <p className="text-center text-xs text-muted-foreground">
                    Point the camera at the buyer's QR code
                  </p>
                )}
              </div>
            )}

            {/* ── MANUAL MODE ── */}
            {mode === "manual" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask the buyer to show their QR code, then paste or type the token below.
                </p>
                <Input
                  placeholder="Paste QR code data or token..."
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualConfirm()}
                  className="rounded-xl"
                  autoFocus
                />
                <Button
                  className="w-full gap-2 rounded-xl"
                  onClick={handleManualConfirm}
                  disabled={confirmDelivery.isPending || !manualToken.trim()}
                >
                  {confirmDelivery.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                    : <><CheckCircle className="h-4 w-4" /> Confirm Delivery</>}
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              💡 The buyer's QR code contains a unique token. Scanning it releases payment to your wallet.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ScanQR;
