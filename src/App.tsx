import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SplashScreen } from "@/components/SplashScreen";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Marketplace from "./pages/Marketplace";
import ListingDetail from "./pages/ListingDetail";
import CreateListing from "./pages/CreateListing";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import Favorites from "./pages/Favorites";
import Admin from "./pages/Admin";
import Orders from "./pages/Orders";
import OrderQR from "./pages/OrderQR";
import ScanQR from "./pages/ScanQR";
import Checkout from "./pages/Checkout";
import PaymentCallback from "./pages/PaymentCallback";
import Wallet from "./pages/Wallet";
import NotFound from "./pages/NotFound";
import { BottomNav } from "@/components/BottomNav";

const queryClient = new QueryClient();

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        supabase.from("profiles").select("*").eq("user_id", session.user.id).single().then(({ data }) => setProfile(data));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/create-listing" element={<CreateListing />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/order/:id/qr" element={<OrderQR />} />
        <Route path="/order/:id/scan" element={<ScanQR />} />
        <Route path="/checkout/:id" element={<Checkout />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
        <BrowserRouter>
          <AuthProvider>
            <OnboardingOverlay />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
              <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_10%,hsl(var(--gold-light)/0.25)_0%,transparent_55%),radial-gradient(60%_50%_at_80%_0%,hsl(var(--primary)/0.18)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,hsl(var(--primary)/0.10)_0%,transparent_60%)] dark:bg-[radial-gradient(60%_50%_at_20%_10%,hsl(var(--primary)/0.18)_0%,transparent_55%),radial-gradient(60%_50%_at_80%_0%,hsl(var(--gold)/0.18)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,hsl(var(--gold)/0.10)_0%,transparent_60%)]" />
              <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent_0%,hsl(var(--background))_65%)]" />
              <Navbar />
              <main className="flex-1 pb-20 md:pb-0">
                <AnimatedRoutes />
              </main>
              <BottomNav />
              <div className="hidden md:block">
                <Footer />
              </div>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
