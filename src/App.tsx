import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { BottomNav } from "@/components/BottomNav";
import { RouteProgressBar, PageLoader } from "@/components/PageLoader";
import { useNotifications } from "@/hooks/useNotifications";
import { SplashScreen } from "@/components/SplashScreen";

function NotificationManager() {
  useNotifications();
  return null;
}

// Eagerly load critical path
import Login from "./pages/Login";
import Register from "./pages/Register";
import Index from "./pages/Index";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Lazy load everything else
const Marketplace     = lazy(() => import("./pages/Marketplace"));
const ListingDetail   = lazy(() => import("./pages/ListingDetail"));
const CreateListing   = lazy(() => import("./pages/CreateListing"));
const Profile         = lazy(() => import("./pages/Profile"));
const Chat            = lazy(() => import("./pages/Chat"));
const Favorites       = lazy(() => import("./pages/Favorites"));
const Admin           = lazy(() => import("./pages/Admin"));
const Orders          = lazy(() => import("./pages/Orders"));
const OrderQR         = lazy(() => import("./pages/OrderQR"));
const ScanQR          = lazy(() => import("./pages/ScanQR"));
const Checkout        = lazy(() => import("./pages/Checkout"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const Wallet          = lazy(() => import("./pages/Wallet"));
const Settings        = lazy(() => import("./pages/Settings"));
const NotFound        = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSession, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        supabase.from("profiles").select("*").eq("user_id", session.user.id).single()
          .then(({ data }) => setProfile(data));
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const { user, isLoading } = useAuthStore();
  const authPaths = ["/login", "/register", "/forgot-password", "/reset-password"];
  const isAuthPage = authPaths.includes(location.pathname);
  const isChatPage = location.pathname === "/chat";
  const hideNav = isAuthPage || isChatPage;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          <div className="absolute inset-[6px] animate-ping rounded-full bg-primary/20" />
        </div>
      </div>
    );
  }

  if (!user && !isAuthPage) return <Navigate to="/login" replace />;
  if (user && isAuthPage) return <Navigate to="/" replace />;

  return (
    <>
      {user && !hideNav && <Navbar />}
      <RouteProgressBar />
      <main className={`flex-1 ${user && !isAuthPage && !isChatPage ? "pt-16 pb-20 md:pb-0" : ""}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {user && !isAuthPage && !isChatPage && <BottomNav />}
      {!isChatPage && <div className="hidden md:block"><Footer /></div>}
    </>
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
            <NotificationManager />
            <OnboardingOverlay />
            <div className="flex min-h-screen flex-col bg-background text-foreground">
              <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(60%_50%_at_20%_10%,hsl(var(--gold-light)/0.25)_0%,transparent_55%),radial-gradient(60%_50%_at_80%_0%,hsl(var(--primary)/0.18)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,hsl(var(--primary)/0.10)_0%,transparent_60%)] dark:bg-[radial-gradient(60%_50%_at_20%_10%,hsl(var(--primary)/0.18)_0%,transparent_55%),radial-gradient(60%_50%_at_80%_0%,hsl(var(--gold)/0.18)_0%,transparent_60%),radial-gradient(60%_60%_at_50%_100%,hsl(var(--gold)/0.10)_0%,transparent_60%)]" />
              <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent_0%,hsl(var(--background))_65%)]" />
              <AppRoutes />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
