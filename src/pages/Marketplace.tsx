import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageTransition } from "@/components/PageTransition";
import { CATEGORIES } from "@/lib/constants";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, Heart, ShoppingBag, Star,
  ArrowRight, Package, TrendingUp, Sparkles, Clock, Flame,
  MapPin, Users, ChevronRight, Zap,
} from "lucide-react";

/* ── Sold Ticker ── */
function SoldTicker() {
  const { data: sold = [] } = useQuery({
    queryKey: ["sold-ticker"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("amount, listings(title), profiles!orders_buyer_id_fkey(full_name)")
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
  });
  if (!sold.length) return null;
  const items = [...sold, ...sold];
  return (
    <div className="overflow-hidden bg-primary py-1.5">
      <div className="flex animate-[marquee_28s_linear_infinite] gap-10 whitespace-nowrap">
        {items.map((s: any, i) => (
          <span key={i} className="flex items-center gap-2 text-[11px] text-primary-foreground/90 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            <span className="font-semibold text-white">{(s.profiles as any)?.full_name?.split(" ")[0] || "Someone"}</span>
            just sold
            <span className="font-semibold text-white">{(s.listings as any)?.title?.slice(0, 25) || "an item"}</span>
            · ₦{Number(s.amount).toLocaleString()}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Hero Carousel ── */
function HeroCarousel({ listings }: { listings: any[] }) {
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = () => { timer.current = setInterval(() => setActive(p => (p + 1) % listings.length), 4500); };
  useEffect(() => {
    if (listings.length > 1) { start(); return () => { if (timer.current) clearInterval(timer.current); }; }
  }, [listings.length]);
  if (!listings.length) return null;
  return (
    <div className="relative w-full overflow-hidden bg-zinc-900" style={{ aspectRatio: "16/9", maxHeight: 460 }}>
      {listings.map((l, i) => (
        <div key={l.id} className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100" : "opacity-0"}`}>
          <img src={l.images?.[0]} alt={l.title} className="h-full w-full object-cover" decoding="async" />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground mb-2">
          <Sparkles className="h-2.5 w-2.5" /> Featured
        </span>
        <h2 className="font-display text-xl font-black text-white md:text-3xl line-clamp-2 max-w-lg leading-tight">
          {listings[active]?.title}
        </h2>
        <p className="mt-1 text-2xl font-black text-white">₦{Number(listings[active]?.price).toLocaleString()}</p>
        <Link to={`/listing/${listings[active]?.id}`} className="mt-3 inline-flex">
          <Button size="sm" className="rounded-2xl gap-2 font-bold">Buy Now <ArrowRight className="h-3.5 w-3.5" /></Button>
        </Link>
      </div>
      {listings.length > 1 && (
        <div className="absolute bottom-4 right-5 flex gap-1.5 z-10">
          {listings.map((_, i) => (
            <button key={i} onClick={() => { setActive(i); if (timer.current) { clearInterval(timer.current); start(); } }}
              className={`h-1.5 rounded-full transition-all ${i === active ? "w-6 bg-white" : "w-1.5 bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Flash Deal Card ── */
function FlashCard({ listing, endsAt }: { listing: any; endsAt: Date }) {
  const [t, setT] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = endsAt.getTime() - Date.now();
      if (d <= 0) { setT("Ended"); return; }
      const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
      setT(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [endsAt]);
  return (
    <Link to={`/listing/${listing.id}`} className="group shrink-0 w-40 md:w-48">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
        <div className="relative aspect-square overflow-hidden bg-muted/40">
          {listing.images?.[0]
            ? <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" decoding="async" />
            : <div className="flex h-full items-center justify-center text-3xl">📦</div>}
          <div className="absolute bottom-0 inset-x-0 bg-destructive/90 py-1 text-center text-[10px] font-bold text-white flex items-center justify-center gap-1">
            <Clock className="h-2.5 w-2.5" /> {t}
          </div>
        </div>
        <div className="p-2.5">
          <p className="line-clamp-1 text-xs font-semibold">{listing.title}</p>
          <p className="mt-0.5 text-xs font-black text-primary">₦{Number(listing.price).toLocaleString()}</p>
        </div>
      </div>
    </Link>
  );
}

/* ── Horizontal Shelf ── */
function Shelf({ title, icon, listings, seeAllHref, badge }: {
  title: string; icon: React.ReactNode; listings: any[];
  seeAllHref: string; badge?: React.ReactNode;
}) {
  if (!listings.length) return null;
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">{icon}<h3 className="font-display text-base font-bold">{title}</h3>{badge}</div>
        <Link to={seeAllHref} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          See all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
        {listings.map((listing: any) => (
          <Link key={listing.id} to={`/listing/${listing.id}`} className="group shrink-0 w-36 md:w-44">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="relative aspect-square overflow-hidden bg-muted/40">
                {listing.images?.[0]
                  ? <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" decoding="async" />
                  : <div className="flex h-full items-center justify-center text-3xl">📦</div>}
                {listing._rank && <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-[10px] font-black text-white">#{listing._rank}</span>}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-1 text-xs font-semibold">{listing.title}</p>
                <p className="mt-0.5 text-xs font-black text-primary">₦{Number(listing.price).toLocaleString()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Masonry Card ── */
function MasonryCard({ listing, tall }: { listing: any; tall: boolean }) {
  const [liked, setLiked] = useState(false);
  return (
    <Link to={`/listing/${listing.id}`} className="group block break-inside-avoid mb-3">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
        <div className={`relative overflow-hidden bg-muted/40 ${tall ? "aspect-[3/4]" : "aspect-square"}`}>
          {listing.images?.[0]
            ? <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async" />
            : <div className="flex h-full items-center justify-center text-4xl">📦</div>}
          {listing.condition === "new" && <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">New</span>}
          <button onClick={e => { e.preventDefault(); setLiked(p => !p); }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur">
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </button>
        </div>
        <div className="p-3">
          <p className="line-clamp-2 text-xs font-semibold leading-snug">{listing.title}</p>
          <p className="mt-1 text-sm font-black text-foreground">₦{Number(listing.price).toLocaleString()}</p>
          {listing.seller_profile?.full_name && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{listing.seller_profile.full_name}</p>}
        </div>
      </div>
    </Link>
  );
}

/* ── Product Card (grid) ── */
function ProductCard({ listing, wishlist, onWishlist }: { listing: any; wishlist: Set<string>; onWishlist: (id: string) => void }) {
  const liked = wishlist.has(listing.id);
  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-card border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="relative w-full overflow-hidden bg-muted/40" style={{ aspectRatio: "1/1" }}>
        {listing.images?.[0]
          ? <img src={listing.images[0]} alt={listing.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
          : <div className="flex h-full items-center justify-center text-5xl">📦</div>}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {listing.is_featured && <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow"><Sparkles className="h-2.5 w-2.5" /> Featured</span>}
          {listing.condition === "new" && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">New</span>}
        </div>
        <button onClick={(e) => { e.preventDefault(); onWishlist(listing.id); }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur transition-transform active:scale-90 hover:scale-110">
          <Heart className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
        </button>
        <Link to={`/listing/${listing.id}`}
          className="absolute inset-x-0 bottom-0 hidden md:flex translate-y-full items-center justify-center gap-2 bg-primary/95 py-3 text-sm font-bold text-primary-foreground backdrop-blur transition-transform duration-300 group-hover:translate-y-0">
          <ShoppingBag className="h-4 w-4" /> Buy Now
        </Link>
      </div>
      <Link to={`/listing/${listing.id}`} className="flex flex-1 flex-col p-3">
        <p className="line-clamp-1 text-sm font-semibold text-foreground">{listing.title}</p>
        {listing.seller_profile?.full_name && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{listing.seller_profile.full_name}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-black text-foreground">₦{Number(listing.price).toLocaleString()}</span>
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 4.8</span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Main ── */
const Marketplace = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [condition, setCondition] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"grid" | "masonry">("grid");
  const PAGE_SIZE = 16;
  const flashEnds = useRef(new Date(Date.now() + 6 * 3600 * 1000));

  // Sticky section tracking
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [activeSection, setActiveSection] = useState("");
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { rootMargin: "-35% 0px -60% 0px" }
    );
    Object.values(sectionRefs.current).forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);
  const reg = (id: string) => (el: HTMLElement | null) => { sectionRefs.current[id] = el; };

  const toggleWishlist = (id: string) => setWishlist(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearFilters = () => { setSearch(""); setCategory("all"); setCondition("all"); setPriceRange({ min: "", max: "" }); setPage(0); };
  const hasActiveFilters = search || category !== "all" || condition !== "all" || priceRange.min || priceRange.max;

  /* Queries */
  const { data: heroListings = [] } = useQuery({
    queryKey: ["mp-hero"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("is_featured", true).eq("is_active", true).order("created_at", { ascending: false }).limit(4);
      return data || [];
    },
  });

  const { data: justDropped = [] } = useQuery({
    queryKey: ["mp-just-dropped"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { data } = await supabase.from("listings").select("*").eq("is_active", true).gte("created_at", since).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: flashDeals = [] } = useQuery({
    queryKey: ["mp-flash"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("is_active", true).order("price", { ascending: true }).limit(8);
      return data || [];
    },
  });

  const { data: trending = [] } = useQuery({
    queryKey: ["mp-trending"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data: favs } = await supabase.from("favorites").select("listing_id").gte("created_at", since);
      if (!favs?.length) { const { data } = await supabase.from("listings").select("*").eq("is_active", true).limit(8); return data || []; }
      const counts: Record<string, number> = {};
      favs.forEach(f => { counts[f.listing_id] = (counts[f.listing_id] || 0) + 1; });
      const topIds = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
      const { data } = await supabase.from("listings").select("*").in("id", topIds).eq("is_active", true);
      return data || [];
    },
  });

  const { data: shelfData = {} as Record<string, any[]> } = useQuery({
    queryKey: ["mp-shelves"],
    queryFn: async () => {
      const result: Record<string, any[]> = {};
      await Promise.all(CATEGORIES.map(async cat => {
        const { data } = await supabase.from("listings").select("*").eq("category", cat.value as any).eq("is_active", true).order("created_at", { ascending: false }).limit(8);
        result[cat.value] = data || [];
      }));
      return result;
    },
  });

  const { data: nearYou = [] } = useQuery({
    queryKey: ["mp-near-you"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("is_active", true).not("location", "is", null).order("created_at", { ascending: false }).limit(8);
      return data || [];
    },
  });

  const { data: followedListings = [] } = useQuery({
    queryKey: ["mp-followed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user!.id);
      if (!follows?.length) return [];
      const ids = follows.map(f => f.following_id);
      const { data } = await supabase.from("listings").select("*, profiles!listings_seller_id_fkey(full_name, avatar_url)").in("seller_id", ids).eq("is_active", true).order("created_at", { ascending: false }).limit(8);
      return data || [];
    },
  });

  /* Main search/filter query */
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", search, category, condition, sortBy, priceRange, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("listings").select("*", { count: "exact" }).eq("is_active", true);
      if (search) q = q.ilike("title", `%${search}%`);
      if (category !== "all") q = q.eq("category", category as any);
      if (condition !== "all") q = q.eq("condition", condition as any);
      if (priceRange.min) q = q.gte("price", parseFloat(priceRange.min));
      if (priceRange.max) q = q.lte("price", parseFloat(priceRange.max));
      if (sortBy === "newest") q = q.order("created_at", { ascending: false });
      else if (sortBy === "price_low") q = q.order("price", { ascending: true });
      else if (sortBy === "price_high") q = q.order("price", { ascending: false });
      q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data: rows, count } = await q;
      if (!rows?.length) return { listings: [], total: count || 0 };
      const ids = [...new Set(rows.map(r => r.seller_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const pm = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return { listings: rows.map(r => ({ ...r, seller_profile: pm[r.seller_id] })), total: count || 0 };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  const pills = [
    { id: "mp-just-dropped", label: "🔥 Just Dropped" },
    { id: "mp-flash", label: "⚡ Flash Deals" },
    { id: "mp-trending", label: "📈 Trending" },
    ...CATEGORIES.map(c => ({ id: `mp-cat-${c.value}`, label: `${c.icon} ${c.label}` })),
    { id: "mp-near", label: "📍 Near You" },
    { id: "mp-all", label: "🛒 All Items" },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 md:pb-10 overflow-x-hidden">

        {/* Sold Ticker */}
        <SoldTicker />

        {/* Hero Carousel — only when no active search/filter */}
        {!hasActiveFilters && <HeroCarousel listings={heroListings} />}

        {/* Sticky header */}
        <div className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur">
          {/* Search + filter row */}
          <div className="flex items-center gap-2 px-3 py-2.5 md:px-8">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search items, food, books..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="h-10 rounded-full pl-9 pr-4 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-sm" />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${showFilters ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}>
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilters && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />}
            </button>
            <Link to="/create-listing">
              <Button size="sm" className="rounded-full gap-1 text-xs px-3 h-10 shrink-0"><Package className="h-3.5 w-3.5" /> Sell</Button>
            </Link>
          </div>

          {/* Filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t">
                <div className="flex flex-wrap items-center gap-2 px-3 py-3 md:px-8">
                  <Select value={condition} onValueChange={(v) => { setCondition(v); setPage(0); }}>
                    <SelectTrigger className="h-9 w-36 rounded-full text-xs border bg-card"><SelectValue placeholder="Condition" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      <SelectItem value="new">Brand New</SelectItem>
                      <SelectItem value="fairly_used">Fairly Used</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 w-40 rounded-full text-xs border bg-card"><SelectValue placeholder="Sort by" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price_low">Price: Low → High</SelectItem>
                      <SelectItem value="price_high">Price: High → Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1.5">
                    <Input placeholder="Min ₦" type="number" value={priceRange.min} onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })} className="h-9 w-24 rounded-full text-xs" />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input placeholder="Max ₦" type="number" value={priceRange.max} onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })} className="h-9 w-24 rounded-full text-xs" />
                  </div>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="flex h-9 items-center gap-1 rounded-full border px-3 text-xs text-destructive hover:bg-destructive/10 transition-colors">
                      <X className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section pill bar */}
          {!hasActiveFilters && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide px-3 pb-2 pt-1 md:px-8">
              {pills.map(p => (
                <button key={p.id} onClick={() => document.getElementById(p.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className={`flex h-7 shrink-0 items-center rounded-full px-3 text-[11px] font-semibold transition-all ${activeSection === p.id ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground hover:bg-muted"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Category pills — always visible */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-3 pb-2.5 pt-1 md:px-8">
            <button onClick={() => { setCategory("all"); setPage(0); }}
              className={`flex h-8 shrink-0 items-center rounded-full px-4 text-xs font-semibold transition-all ${category === "all" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/60 hover:bg-muted"}`}>
              All
            </button>
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => { setCategory(c.value); setPage(0); }}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-all ${category === c.value ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/60 hover:bg-muted"}`}>
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-3 md:px-8">

          {/* Discovery sections — only when no active filters */}
          {!hasActiveFilters && (
            <>
              {/* Just Dropped */}
              <section id="mp-just-dropped" ref={reg("mp-just-dropped")} className="mt-6">
                <Shelf title="Just Dropped" icon={<Flame className="h-5 w-5 text-orange-500" />}
                  listings={justDropped} seeAllHref="/marketplace"
                  badge={<span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />} />
              </section>

              {/* Flash Deals */}
              <section id="mp-flash" ref={reg("mp-flash")}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <h3 className="font-display text-base font-bold">Flash Deals</h3>
                    <span className="rounded-full bg-destructive px-2 py-0.5 text-[9px] font-bold text-white">Ends Soon</span>
                  </div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
                  {flashDeals.map((l: any) => <FlashCard key={l.id} listing={l} endsAt={flashEnds.current} />)}
                </div>
              </section>

              {/* Trending */}
              <section id="mp-trending" ref={reg("mp-trending")} className="mt-6">
                <Shelf title="Trending This Week" icon={<TrendingUp className="h-5 w-5 text-primary" />}
                  listings={trending.map((l: any, i: number) => ({ ...l, _rank: i + 1 }))}
                  seeAllHref="/marketplace" />
              </section>

              {/* Category Shelves */}
              <section className="mt-2">
                {CATEGORIES.map(cat => (
                  <div key={cat.value} id={`mp-cat-${cat.value}`} ref={reg(`mp-cat-${cat.value}`)}>
                    <Shelf title={cat.label} icon={<span className="text-xl">{cat.icon}</span>}
                      listings={shelfData[cat.value] || []}
                      seeAllHref={`/marketplace?category=${cat.value}`} />
                  </div>
                ))}
              </section>

              {/* Near You */}
              {nearYou.length > 0 && (
                <section id="mp-near" ref={reg("mp-near")} className="mt-2">
                  <Shelf title="Near You on Campus" icon={<MapPin className="h-5 w-5 text-blue-500" />}
                    listings={nearYou} seeAllHref="/marketplace" />
                </section>
              )}

              {/* Sellers You Follow */}
              {followedListings.length > 0 && (
                <section className="mt-2 mb-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-base font-bold">From Sellers You Follow</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
                    {followedListings.map((listing: any) => (
                      <Link key={listing.id} to={`/listing/${listing.id}`} className="group shrink-0 w-40 md:w-48">
                        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                          <div className="relative aspect-square overflow-hidden bg-muted/40">
                            {listing.images?.[0]
                              ? <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" loading="lazy" decoding="async" />
                              : <div className="flex h-full items-center justify-center text-3xl">📦</div>}
                          </div>
                          <div className="p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={(listing.profiles as any)?.avatar_url} />
                                <AvatarFallback className="text-[8px] bg-primary text-primary-foreground">{(listing.profiles as any)?.full_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <p className="truncate text-[10px] text-muted-foreground">{(listing.profiles as any)?.full_name}</p>
                            </div>
                            <p className="line-clamp-1 text-xs font-semibold">{listing.title}</p>
                            <p className="mt-0.5 text-xs font-black text-primary">₦{Number(listing.price).toLocaleString()}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Masonry Discover */}
              <section className="mb-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">Discover More</h2>
                  <div className="flex gap-1">
                    <button onClick={() => setView("grid")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>Grid</button>
                    <button onClick={() => setView("masonry")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${view === "masonry" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>Masonry</button>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* All Items section */}
          <section id="mp-all" ref={reg("mp-all")}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-black">
                  {category !== "all" ? CATEGORIES.find(c => c.value === category)?.label : search ? `Results for "${search}"` : "All Products"}
                </h2>
                {data && <p className="mt-0.5 text-xs text-muted-foreground">{data.total.toLocaleString()} {data.total === 1 ? "item" : "items"} found</p>}
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted/50" />)}
              </div>
            ) : data?.listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 text-4xl">🔍</div>
                <p className="mt-4 text-lg font-bold">Nothing found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try different keywords or clear your filters</p>
                {hasActiveFilters && <Button variant="outline" size="sm" className="mt-4 rounded-full gap-1" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Clear filters</Button>}
              </div>
            ) : view === "masonry" && !hasActiveFilters ? (
              <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3">
                {data?.listings.map((listing: any, i: number) => <MasonryCard key={listing.id} listing={listing} tall={i % 3 === 0} />)}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={`${category}-${search}-${page}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                  className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4 lg:grid-cols-5">
                  {data?.listings.map((listing: any) => <ProductCard key={listing.id} listing={listing} wishlist={wishlist} onWishlist={toggleWishlist} />)}
                </motion.div>
              </AnimatePresence>
            )}
          </section>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-full px-5">← Prev</Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return <button key={p} onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>{p + 1}</button>;
                })}
              </div>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-full px-5">Next →</Button>
            </div>
          )}

          {/* Sell CTA */}
          {!isLoading && (
            <div className="mt-10 mb-4 overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary/70 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">For Students</p>
                  <h3 className="mt-1 font-display text-xl font-black text-primary-foreground">Have something to sell?</h3>
                  <p className="mt-0.5 text-sm text-primary-foreground/80">List for free and reach your campus instantly.</p>
                </div>
                <Link to="/create-listing" className="shrink-0">
                  <Button variant="secondary" size="sm" className="rounded-2xl gap-1.5 font-bold"><TrendingUp className="h-4 w-4" /> Start Selling</Button>
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </PageTransition>
  );
};

export default Marketplace;
