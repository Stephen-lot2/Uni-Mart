import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Menu, X, Heart, MessageCircle, Plus, User, LogOut,
  Shield, ShoppingBag, Wallet, Settings, Search, Trophy, Download,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function Navbar() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); setCanInstall(true); };
    window.addEventListener("beforeinstallprompt", handler);
    // Already installed
    if (window.matchMedia("(display-mode: standalone)").matches) setCanInstall(false);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setCanInstall(false);
  };

  // Prefetch key pages on hover for instant navigation
  const prefetchMarketplace = () => {
    queryClient.prefetchQuery({
      queryKey: ["marketplace", "", "all", "all", "newest", { min: "", max: "" }, 0],
      queryFn: async () => {
        const { data: rows, count } = await supabase
          .from("listings").select("*", { count: "exact" })
          .eq("is_active", true).order("created_at", { ascending: false }).range(0, 15);
        return { listings: rows || [], total: count || 0 };
      },
      staleTime: 1000 * 60 * 5,
    });
  };

  // Close mobile menu/search when clicking outside the navbar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role")
        .eq("user_id", user!.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  // Unread message count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .neq("sender_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(search.trim())}`);
      setSearch("");
      setMobileOpen(false);
      setSearchOpen(false);
    }
  };

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const navLink = (path: string, label: string) => (
    <Link
      to={path}
      className={`relative text-sm font-medium transition-colors hover:text-foreground ${
        isActive(path) ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
      {isActive(path) && (
        <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 rounded-full bg-primary" />
      )}
    </Link>
  );

  return (
    <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 border-b bg-background/90 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-6 xl:px-10">

        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary shadow-md shadow-primary/30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3)_0%,transparent_60%)]" />
            <span className="relative font-display text-lg font-black text-primary-foreground">C</span>
          </div>
          <span className="font-display text-xl font-black tracking-tight text-foreground">
            CampusMart
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 md:flex ml-4">
          {navLink("/", "Home")}
          <Link
            to="/marketplace"
            onMouseEnter={prefetchMarketplace}
            className={`relative text-sm font-medium transition-colors hover:text-foreground ${
              isActive("/marketplace") ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Marketplace
            {isActive("/marketplace") && (
              <span className="absolute -bottom-[21px] left-0 right-0 h-0.5 rounded-full bg-primary" />
            )}
          </Link>
          <Link
            to="/#leaderboard"
            onClick={e => { e.preventDefault(); document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth" }); }}
            className="relative flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Trophy className="h-3.5 w-3.5 text-yellow-500" /> Leaderboard
          </Link>
        </div>

        {/* Search — desktop, grows to fill space */}
        <form onSubmit={handleSearch} className="hidden flex-1 max-w-lg md:flex items-center mx-4">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for items, food, books..."
              className="h-10 w-full rounded-full border-border/50 bg-muted/50 pl-10 pr-4 text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
            />
          </div>
        </form>

        {/* Desktop right actions */}
        <div className="hidden items-center gap-1 md:flex ml-auto">
          {user ? (
            <>
              {/* Install App button */}
              {canInstall && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleInstall}
                  className="gap-1.5 rounded-full px-4 font-semibold border-primary/40 text-primary hover:bg-primary/5"
                >
                  <Download className="h-3.5 w-3.5" /> Install App
                </Button>
              )}

              {/* Sell button */}
              <Link to="/create-listing">
                <Button size="sm" className="gap-1.5 rounded-full px-4 font-semibold shadow-sm shadow-primary/20">
                  <Plus className="h-3.5 w-3.5" /> Sell
                </Button>
              </Link>

              {/* Icon buttons */}
              <Link to="/favorites">
                <Button
                  variant="ghost" size="icon"
                  className={`h-9 w-9 rounded-full ${isActive("/favorites") ? "bg-muted text-primary" : ""}`}
                >
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>

              <Link to="/chat" className="relative">
                <Button
                  variant="ghost" size="icon"
                  className={`h-9 w-9 rounded-full ${isActive("/chat") ? "bg-muted text-primary" : ""}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <Link to="/orders">
                <Button
                  variant="ghost" size="icon"
                  className={`h-9 w-9 rounded-full ${isActive("/orders") ? "bg-muted text-primary" : ""}`}
                >
                  <ShoppingBag className="h-4 w-4" />
                </Button>
              </Link>

              {/* Avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-1 flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30 focus:outline-none focus:ring-primary/50">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                        {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl">
                  <DropdownMenuLabel className="px-3 py-2">
                    <p className="text-sm font-semibold truncate">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl gap-2 cursor-pointer">
                    <User className="h-4 w-4" /> Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/wallet")} className="rounded-xl gap-2 cursor-pointer">
                    <Wallet className="h-4 w-4" /> Wallet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/orders")} className="rounded-xl gap-2 cursor-pointer">
                    <ShoppingBag className="h-4 w-4" /> Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-xl gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" /> Settings
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="rounded-xl gap-2 cursor-pointer text-primary">
                        <Shield className="h-4 w-4" /> Admin Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="rounded-xl gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                    <LogOut className="h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex gap-2">
              <Link to="/login"><Button variant="ghost" size="sm" className="rounded-full">Log in</Button></Link>
              <Link to="/register"><Button size="sm" className="rounded-full px-5">Sign up</Button></Link>
            </div>
          )}
        </div>

        {/* Mobile: search + avatar + hamburger */}
        <div className="flex items-center gap-1 md:hidden ml-auto">
          <button
            onClick={() => { setSearchOpen(!searchOpen); setMobileOpen(false); setTimeout(() => searchInputRef.current?.focus(), 50); }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>

          {/* Profile avatar — mobile only */}
          {user && (
            <Link to="/profile" className="flex h-9 w-9 items-center justify-center">
              <Avatar className="h-8 w-8 ring-2 ring-transparent hover:ring-primary/30 transition-all">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          )}

          <button
            onClick={() => { setMobileOpen(!mobileOpen); setSearchOpen(false); }}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="border-t bg-background/95 px-4 py-3 backdrop-blur-xl md:hidden">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for items, food, books..."
                className="h-10 rounded-full pl-9 bg-muted border-none focus-visible:ring-1"
              />
            </div>
            <Button type="submit" size="sm" className="rounded-full px-5" disabled={!search.trim()}>Go</Button>
          </form>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background/95 p-4 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1">
            {[
              { to: "/marketplace", label: "Marketplace" },
              { to: "/create-listing", label: "Sell an Item" },
              { to: "/orders", label: "Orders" },
              { to: "/wallet", label: "Wallet" },
              { to: "/favorites", label: "Favorites" },
              { to: "/chat", label: "Messages" },
              { to: "/profile", label: "Profile" },
              { to: "/settings", label: "Settings" },
            ].map(({ to, label }) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
                <button className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-colors ${isActive(to) ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}>
                  {label}
                </button>
              </Link>
            ))}
            <button
              onClick={() => { setMobileOpen(false); document.getElementById("leaderboard")?.scrollIntoView({ behavior: "smooth" }); navigate("/"); }}
              className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center gap-2"
            >
              <Trophy className="h-4 w-4 text-yellow-500" /> Leaderboard
            </button>
            {canInstall && (
              <button
                onClick={() => { setMobileOpen(false); handleInstall(); }}
                className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" /> Install App
              </button>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileOpen(false)}>
                <button className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
                  Admin Dashboard
                </button>
              </Link>
            )}
            <div className="mt-2 border-t pt-2">
              <button
                onClick={handleLogout}
                className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
