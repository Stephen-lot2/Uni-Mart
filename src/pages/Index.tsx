import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/PageTransition";
import { CATEGORIES } from "@/lib/constants";
import { ArrowRight, Heart, ShoppingBag, Star, Zap, ShieldCheck, Users, TrendingUp, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";

/* ─── tiny helpers ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
});

const stagger = (i: number) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.45, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
});

/* ─── Product Card (homepage style) ─── */
function ProductCard({ listing, wishlist, onWishlist }: {
  listing: any;
  wishlist: Set<string>;
  onWishlist: (id: string) => void;
}) {
  const liked = wishlist.has(listing.id);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl bg-card border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
        {listing.images?.[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">📦</div>
        )}
        {listing.is_featured && (
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">
            Featured
          </Badge>
        )}
        {/* wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); onWishlist(listing.id); }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-transform hover:scale-110"
        >
          <Heart className={`h-4 w-4 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
        </button>
      </div>

      {/* info */}
      <Link to={`/listing/${listing.id}`} className="flex flex-1 flex-col p-4">
        <p className="line-clamp-1 text-sm font-semibold text-foreground">{listing.title}</p>
        {listing.seller_profile?.full_name && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{listing.seller_profile.full_name}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-base font-bold text-foreground">₦{Number(listing.price).toLocaleString()}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 4.8
          </span>
        </div>
      </Link>

      {/* buy button — slides up on hover */}
      <div className="overflow-hidden">
        <Link
          to={`/listing/${listing.id}`}
          className="flex items-center justify-center gap-2 bg-primary py-3 text-sm font-semibold text-primary-foreground opacity-0 translate-y-full transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
        >
          <ShoppingBag className="h-4 w-4" /> Buy Now
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── Hero Featured Card ─── */
function HeroProductCard({ listing }: { listing: any }) {
  return (
    <Link to={`/listing/${listing.id}`} className="group block">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-muted/60 to-muted/20 border shadow-2xl">
        <div className="aspect-[3/4] w-full overflow-hidden">
          {listing.images?.[0] ? (
            <img
              src={listing.images[0]}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-8xl">📦</div>
          )}
        </div>
        {/* overlay info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
          <Badge className="mb-2 bg-primary text-primary-foreground text-xs rounded-full px-3">New Arrival</Badge>
          <h3 className="font-bold text-white text-xl leading-tight line-clamp-2">{listing.title}</h3>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-2xl font-black text-white">₦{Number(listing.price).toLocaleString()}</span>
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /> 4.9
            </span>
          </div>
          <Button size="sm" className="mt-3 w-full rounded-2xl gap-2 font-semibold">
            Buy Now <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Link>
  );
}

/* ─── Main Page ─── */
const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState("all");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  const toggleWishlist = (id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* featured (hero) */
  const { data: heroListing } = useQuery({
    queryKey: ["hero-listing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("is_featured", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  /* all active listings for grid */
  const { data: listings, isLoading } = useQuery({
    queryKey: ["home-listings", activeCategory],
    queryFn: async () => {
      let q = supabase.from("listings").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(12);
      if (activeCategory !== "all") q = q.eq("category", activeCategory as any);
      const { data: rows } = await q;
      if (!rows?.length) return [];
      const ids = [...new Set(rows.map((r) => r.seller_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      const pm = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, seller_profile: pm[r.seller_id] }));
    },
  });

  /* recently viewed (localStorage) */
  const recentIds: string[] = JSON.parse(localStorage.getItem("recently_viewed") || "[]").slice(0, 4);
  const { data: recentListings } = useQuery({
    queryKey: ["recent-listings", recentIds.join(",")],
    enabled: recentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").in("id", recentIds).eq("is_active", true);
      return data || [];
    },
  });

  return (
    <PageTransition>
      <div className="min-h-screen pb-20 md:pb-0">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden px-5 pt-8 pb-10 md:px-12 md:pt-12">
          {/* bg blobs */}
          <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-secondary/15 blur-3xl" />

          <div className="relative mx-auto max-w-6xl">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">

              {/* left text */}
              <div>
                <motion.div {...fadeUp(0)}>
                  <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
                    <Zap className="h-3 w-3" /> Campus-fast delivery
                  </span>
                </motion.div>

                <motion.h1 {...fadeUp(0.1)} className="mt-5 font-display text-[2.6rem] font-black leading-[1.05] tracking-tight text-foreground md:text-6xl">
                  Shop Smart.<br />
                  <span className="text-primary">Buy Local.</span><br />
                  <span className="text-muted-foreground text-3xl font-semibold md:text-4xl">On Campus.</span>
                </motion.h1>

                <motion.p {...fadeUp(0.2)} className="mt-4 max-w-sm text-base text-muted-foreground">
                  The student marketplace for gadgets, books, fashion, food and more — all within your campus.
                </motion.p>

                <motion.div {...fadeUp(0.3)} className="mt-7 flex flex-wrap gap-3">
                  <Link to="/marketplace">
                    <Button size="lg" className="h-12 gap-2 rounded-2xl px-8 text-base font-bold shadow-lg shadow-primary/25">
                      Shop Now <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/create-listing">
                    <Button size="lg" variant="outline" className="h-12 gap-2 rounded-2xl px-8 text-base">
                      Sell an Item
                    </Button>
                  </Link>
                </motion.div>

                {/* stats row */}
                <motion.div {...fadeUp(0.4)} className="mt-8 flex gap-8">
                  {[
                    { value: "500+", label: "Students" },
                    { value: "1.2k+", label: "Listings" },
                    { value: "4.9★", label: "Rating" },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className="font-display text-2xl font-black text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* right — hero product card or placeholder */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="flex justify-center md:justify-end"
              >
                {heroListing ? (
                  <div className="w-full max-w-xs">
                    <HeroProductCard listing={heroListing} />
                  </div>
                ) : (
                  /* placeholder card when no featured listing */
                  <div className="w-full max-w-xs">
                    <div className="relative overflow-hidden rounded-[2rem] border bg-gradient-to-br from-primary/10 via-card to-secondary/10 shadow-2xl">
                      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-4 p-8">
                        <div className="text-8xl">🛍️</div>
                        <div className="text-center">
                          <p className="font-bold text-foreground text-lg">UniMart</p>
                          <p className="text-sm text-muted-foreground mt-1">Your campus store</p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-center">
                          {["📚 Books", "💻 Gadgets", "👕 Fashion", "🍔 Food"].map((t) => (
                            <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{t}</span>
                          ))}
                        </div>
                        <Link to="/marketplace" className="w-full">
                          <Button className="w-full rounded-2xl gap-2 font-bold">
                            Browse All <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── SPECIAL DEALS ── */}
        <section className="px-5 py-6 md:px-12">
          <div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2">
            <motion.div
              {...stagger(0)}
              className="group relative flex items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-primary/70 p-6 shadow-lg cursor-pointer"
              onClick={() => navigate("/marketplace")}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">Limited Time</p>
                <h3 className="mt-1 font-display text-2xl font-black text-primary-foreground">Free Delivery</h3>
                <p className="mt-0.5 text-sm text-primary-foreground/80">On your first order</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-foreground underline underline-offset-2">
                  Shop Now <ArrowRight className="h-3 w-3" />
                </span>
              </div>
              <span className="text-6xl select-none">🚚</span>
            </motion.div>

            <motion.div
              {...stagger(1)}
              className="group relative flex items-center justify-between overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-zinc-800 dark:to-zinc-600 p-6 shadow-lg cursor-pointer"
              onClick={() => navigate("/register")}
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Student Deal</p>
                <h3 className="mt-1 font-display text-2xl font-black text-white">20% Off</h3>
                <p className="mt-0.5 text-sm text-white/70">For verified students</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white underline underline-offset-2">
                  Get Deal <ArrowRight className="h-3 w-3" />
                </span>
              </div>
              <span className="text-6xl select-none">🎓</span>
            </motion.div>
          </div>
        </section>

        {/* ── CATEGORY FILTER BAR ── */}
        <section className="px-5 py-6 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Browse by Category</h2>
              <Link to="/marketplace" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
              <button
                onClick={() => setActiveCategory("all")}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                    : "bg-card border text-foreground hover:border-primary/40"
                }`}
              >
                All
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all ${
                    activeCategory === cat.value
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "bg-card border text-foreground hover:border-primary/40"
                  }`}
                >
                  <span>{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT GRID ── */}
        <section className="px-5 pb-10 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  {activeCategory === "all" ? "All Products" : CATEGORIES.find(c => c.value === activeCategory)?.label}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {listings?.length ? `${listings.length} items` : ""}
                </p>
              </div>
              <Link to={`/marketplace${activeCategory !== "all" ? `?category=${activeCategory}` : ""}`}>
                <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs">
                  See all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-3xl bg-muted/40 animate-pulse aspect-[3/4]" />
                ))}
              </div>
            ) : listings && listings.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {listings.map((listing: any) => (
                  <ProductCard key={listing.id} listing={listing} wishlist={wishlist} onWishlist={toggleWishlist} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border bg-muted/20 py-20 text-center">
                <p className="text-5xl">🛒</p>
                <p className="mt-3 font-semibold text-foreground">No listings yet</p>
                <p className="text-sm text-muted-foreground mt-1">Be the first to sell in this category</p>
                <Link to="/create-listing">
                  <Button className="mt-5 rounded-2xl gap-2">
                    <Package className="h-4 w-4" /> List an Item
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ── RECENTLY VIEWED ── */}
        {recentListings && recentListings.length > 0 && (
          <section className="px-5 pb-10 md:px-12">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-display text-xl font-bold mb-4">Recently Viewed</h2>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5 md:mx-0 md:px-0">
                {recentListings.map((listing: any) => (
                  <Link key={listing.id} to={`/listing/${listing.id}`} className="shrink-0 w-40 group">
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                      <div className="aspect-square overflow-hidden bg-muted/40">
                        {listing.images?.[0]
                          ? <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          : <div className="flex h-full items-center justify-center text-3xl">📦</div>}
                      </div>
                      <div className="p-2.5">
                        <p className="line-clamp-1 text-xs font-semibold">{listing.title}</p>
                        <p className="text-xs font-bold text-primary mt-0.5">₦{Number(listing.price).toLocaleString()}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── WHY UNIMART ── */}
        <section className="bg-muted/30 px-5 py-14 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl font-bold md:text-3xl">Why UniMart?</h2>
              <p className="mt-2 text-sm text-muted-foreground">Built for students, by students</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-4">
              {[
                { icon: ShieldCheck, title: "Escrow Protection", desc: "Payments held until delivery confirmed via QR code.", color: "bg-green-500/10 text-green-600" },
                { icon: Zap, title: "Fast & Easy", desc: "List in seconds. Find what you need instantly.", color: "bg-yellow-500/10 text-yellow-600" },
                { icon: Users, title: "Campus Community", desc: "Connect with fellow students. Chat and meet on campus.", color: "bg-blue-500/10 text-blue-600" },
                { icon: TrendingUp, title: "Earn on Campus", desc: "Turn unused items into cash. Zero listing fees.", color: "bg-purple-500/10 text-purple-600" },
              ].map((item, i) => (
                <motion.div key={item.title} {...stagger(i)} className="rounded-3xl border bg-card p-6 shadow-sm">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CAMPUS SELLER CTA ── */}
        <section className="px-5 py-12 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8 shadow-2xl md:p-12">
              <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
              <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">For Students</span>
                  <h2 className="mt-3 font-display text-3xl font-black text-white md:text-4xl">
                    Support Student<br />Businesses
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-white/60">
                    Hundreds of student vendors selling on campus. List your items for free and start earning today.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to="/create-listing">
                      <Button size="lg" className="rounded-2xl gap-2 font-bold">
                        <Package className="h-4 w-4" /> Start Selling
                      </Button>
                    </Link>
                    {!user && (
                      <Link to="/register">
                        <Button size="lg" variant="outline" className="rounded-2xl border-white/20 text-white hover:bg-white/10">
                          Register Free
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
                <div className="text-[7rem] select-none leading-none md:text-[9rem]">🏪</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="px-5 pt-8 pb-4 md:px-12 md:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl font-bold md:text-3xl">How it works</h2>
              <p className="mt-2 text-sm text-muted-foreground">From listing to delivery in 3 steps</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { step: "01", emoji: "🔍", title: "Browse & Discover", desc: "Search for what you need or explore categories." },
                { step: "02", emoji: "💬", title: "Chat & Agree", desc: "Message the seller, confirm price and meetup spot." },
                { step: "03", emoji: "✅", title: "Pay & Confirm", desc: "Pay securely via escrow. Confirm delivery with QR code." },
              ].map((item, i) => (
                <motion.div key={item.step} {...stagger(i)} className="relative rounded-3xl border bg-card p-6 shadow-sm">
                  <span className="absolute right-5 top-5 font-display text-5xl font-black text-muted-foreground/10 select-none">{item.step}</span>
                  <div className="text-4xl">{item.emoji}</div>
                  <h3 className="mt-3 font-display text-base font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </PageTransition>
  );
};

export default Index;
