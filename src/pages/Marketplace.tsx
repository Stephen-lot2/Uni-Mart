import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageTransition } from "@/components/PageTransition";
import { CATEGORIES } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, X, Heart, ShoppingBag,
  Star, ArrowRight, Package, TrendingUp, Sparkles,
} from "lucide-react";

/* ── Product Card ── */
function ProductCard({
  listing,
  wishlist,
  onWishlist,
}: {
  listing: any;
  wishlist: Set<string>;
  onWishlist: (id: string) => void;
}) {
  const liked = wishlist.has(listing.id);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-card border shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* image */}
      <div className="relative aspect-square overflow-hidden bg-muted/40">
        {listing.images?.[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">📦</div>
        )}

        {/* badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
          {listing.is_featured && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
              <Sparkles className="h-2.5 w-2.5" /> Featured
            </span>
          )}
          {listing.condition === "new" && (
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
              New
            </span>
          )}
        </div>

        {/* wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); onWishlist(listing.id); }}
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur transition-transform active:scale-90 hover:scale-110"
        >
          <Heart className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
        </button>

        {/* hover buy overlay */}
        <Link
          to={`/listing/${listing.id}`}
          className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-primary/95 py-3 text-sm font-bold text-primary-foreground backdrop-blur transition-transform duration-300 group-hover:translate-y-0"
        >
          <ShoppingBag className="h-4 w-4" /> Buy Now
        </Link>
      </div>

      {/* info */}
      <Link to={`/listing/${listing.id}`} className="flex flex-1 flex-col p-3.5">
        <p className="line-clamp-1 text-sm font-semibold text-foreground">{listing.title}</p>
        {listing.seller_profile?.full_name && (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{listing.seller_profile.full_name}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2.5">
          <span className="text-base font-black text-foreground">₦{Number(listing.price).toLocaleString()}</span>
          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 4.8
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Featured Banner ── */
function FeaturedBanner({ listing }: { listing: any }) {
  return (
    <Link to={`/listing/${listing.id}`} className="group relative flex-shrink-0 w-64 overflow-hidden rounded-3xl shadow-lg">
      <div className="aspect-[3/4] w-full overflow-hidden bg-muted/40">
        {listing.images?.[0] ? (
          <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">📦</div>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="line-clamp-2 text-sm font-bold text-white leading-tight">{listing.title}</p>
        <p className="mt-1 text-lg font-black text-white">₦{Number(listing.price).toLocaleString()}</p>
      </div>
    </Link>
  );
}

/* ── Main ── */
const Marketplace = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [condition, setCondition] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const PAGE_SIZE = 16;

  const toggleWishlist = (id: string) =>
    setWishlist((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const clearFilters = () => {
    setSearch(""); setCategory("all"); setCondition("all");
    setPriceRange({ min: "", max: "" }); setPage(0);
  };

  const hasActiveFilters = search || category !== "all" || condition !== "all" || priceRange.min || priceRange.max;

  /* featured listings for banner row */
  const { data: featured } = useQuery({
    queryKey: ["mp-featured"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("is_featured", true).eq("is_active", true).limit(6);
      return data || [];
    },
  });

  /* main listing query */
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", search, category, condition, sortBy, priceRange, page],
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
      const ids = [...new Set(rows.map((r) => r.seller_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const pm = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      return { listings: rows.map((r) => ({ ...r, seller_profile: pm[r.seller_id] })), total: count || 0 };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <PageTransition>
      <div className="min-h-screen pb-24 md:pb-10">

        {/* ── TOP HEADER ── */}
        <div className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur px-5 py-3 md:px-8">
          <div className="mx-auto max-w-7xl flex items-center gap-3">
            {/* search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for items, food, books..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="h-11 rounded-full pl-10 pr-4 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
                showFilters ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground hover:bg-muted"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>
          </div>

          {/* filter panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-2 pt-3 pb-1">
                  <Select value={condition} onValueChange={(v) => { setCondition(v); setPage(0); }}>
                    <SelectTrigger className="h-9 w-36 rounded-full text-xs border bg-card">
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Conditions</SelectItem>
                      <SelectItem value="new">Brand New</SelectItem>
                      <SelectItem value="fairly_used">Fairly Used</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 w-40 rounded-full text-xs border bg-card">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price_low">Price: Low → High</SelectItem>
                      <SelectItem value="price_high">Price: High → Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="Min ₦"
                      type="number"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="h-9 w-24 rounded-full text-xs"
                    />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input
                      placeholder="Max ₦"
                      type="number"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="h-9 w-24 rounded-full text-xs"
                    />
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

          {/* category pills */}
          <div className="mx-auto max-w-7xl flex gap-2.5 overflow-x-auto pb-1 pt-3 scrollbar-hide -mx-5 px-5 md:mx-auto md:px-0">
            <button
              onClick={() => { setCategory("all"); setPage(0); }}
              className={`flex h-9 shrink-0 items-center rounded-full px-5 text-xs font-semibold transition-all ${
                category === "all" ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "bg-muted/60 text-foreground hover:bg-muted"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value); setPage(0); }}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-5 text-xs font-semibold transition-all ${
                  category === c.value ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "bg-muted/60 text-foreground hover:bg-muted"
                }`}
              >
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 md:px-8">

          {/* ── FEATURED BANNER ROW (only when no active filters) ── */}
          {!hasActiveFilters && featured && featured.length > 0 && (
            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-base font-bold">Featured</h2>
                </div>
                <span className="text-xs text-muted-foreground">{featured.length} items</span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
                {featured.map((listing: any) => (
                  <FeaturedBanner key={listing.id} listing={listing} />
                ))}
              </div>
            </section>
          )}

          {/* ── RESULTS HEADER ── */}
          <div className="mt-6 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-black text-foreground">
                {category !== "all"
                  ? CATEGORIES.find((c) => c.value === category)?.label
                  : search
                  ? `Results for "${search}"`
                  : "All Products"}
              </h1>
              {data && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {data.total.toLocaleString()} {data.total === 1 ? "item" : "items"} found
                </p>
              )}
            </div>
            <Link to="/create-listing">
              <Button size="sm" variant="outline" className="gap-1.5 rounded-full text-xs">
                <Package className="h-3.5 w-3.5" /> Sell
              </Button>
            </Link>
          </div>

          {/* ── GRID ── */}
          {isLoading ? (
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-muted/50" />
              ))}
            </div>
          ) : data?.listings.length === 0 ? (
            <div className="mt-10 flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 text-4xl">🔍</div>
              <p className="mt-4 text-lg font-bold">Nothing found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try different keywords or clear your filters</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4 rounded-full gap-1" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear filters
                </Button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${category}-${search}-${page}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5"
              >
                {data?.listings.map((listing: any) => (
                  <ProductCard
                    key={listing.id}
                    listing={listing}
                    wishlist={wishlist}
                    onWishlist={toggleWishlist}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="rounded-full px-5"
              >
                ← Prev
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                        p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {p + 1}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="rounded-full px-5"
              >
                Next →
              </Button>
            </div>
          )}

          {/* ── SELL CTA (bottom) ── */}
          {!isLoading && (
            <div className="mt-12 overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary/70 p-6 shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary-foreground/70">For Students</p>
                  <h3 className="mt-1 font-display text-xl font-black text-primary-foreground">Have something to sell?</h3>
                  <p className="mt-0.5 text-sm text-primary-foreground/80">List for free and reach your campus instantly.</p>
                </div>
                <Link to="/create-listing" className="shrink-0">
                  <Button variant="secondary" size="sm" className="rounded-2xl gap-1.5 font-bold">
                    <TrendingUp className="h-4 w-4" /> Start Selling
                  </Button>
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
