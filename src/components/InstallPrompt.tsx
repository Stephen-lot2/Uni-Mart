import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, ShoppingBag, Zap, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "CampusMart-install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions after a short delay
      const t = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-card px-6 pb-10 pt-6 shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />

            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute right-5 top-5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Icon + heading */}
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <ShoppingBag size={28} />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold text-foreground">Get the App</h2>
                <p className="text-sm text-muted-foreground">CampusMart on your home screen</p>
              </div>
            </div>

            {/* Features */}
            <ul className="mb-6 space-y-3">
              {[
                { icon: Zap, text: "Faster browsing, no browser bar" },
                { icon: Bell, text: "Instant notifications for messages & orders" },
                { icon: Download, text: "Works offline — browse saved listings" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-foreground/80">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={15} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            {isIOS ? (
              <div className="rounded-2xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
                Tap the <span className="font-semibold text-foreground">Share</span> button in Safari, then choose{" "}
                <span className="font-semibold text-foreground">"Add to Home Screen"</span>.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleInstall}
                  className="h-12 w-full rounded-2xl text-base font-semibold"
                >
                  <Download size={18} className="mr-2" />
                  Install App
                </Button>
                <Button
                  variant="ghost"
                  onClick={dismiss}
                  className="h-10 w-full rounded-2xl text-sm text-muted-foreground"
                >
                  Not now
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

