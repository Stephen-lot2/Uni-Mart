import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListingCard } from "@/components/ListingCard";
import { ListingGridSkeleton } from "@/components/ListingSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { CATEGORIES } from "@/lib/constants";
import { Search, ArrowRight, ShieldCheck, Users, Zap, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: featuredListings, isLoading: loadingFeatured } = useQuery({
    queryKey: ["featured-listings"],
    queryFn: async () => {
      const { data: listings } = await supabase
        .from("listings")
        .select("*")
        .eq("is_featured", true)
        .eq("is_active", true)
        .limit(4);
      if (!listings || listings.length === 0) return [];
      const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", sellerIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      return listings.map((l) => ({ ...l, seller_profile: profileMap[l.seller_id] }));
    },
  });

  const { data: newestListings, isLoading: loadingNewest } = useQuery({
    queryKey: ["newest-listings"],
    queryFn: async () => {
      const { data: listings } = await supabase
        .from("listings")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!listings || listings.length === 0) return [];
      const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", sellerIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      return listings.map((l) => ({ ...l, seller_profile: profileMap[l.seller_id] }));
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(search)}`);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-20 md:pb-0">
        {/* Welcome / Hero */}
        <section className="relative flex min-h-[90vh] flex-col overflow-hidden px-6 pt-12 md:flex-row md:items-center md:px-16 lg:px-24">
          <div className="order-2 mt-8 flex w-full flex-1 flex-col justify-end pb-8 z-10 md:order-1 md:mt-0 md:justify-center md:pb-0">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="font-display text-5xl font-bold leading-[1.1] text-foreground md:text-6xl lg:text-7xl">
                A Marketplace <br />
                <span className="relative inline-block">
                  Built
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q 50 5 100 15" fill="transparent" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>{" "}
                for You
              </h1>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground md:text-xl">
                Buy and sell items within your campus easily and securely.
              </p>
            </motion.div>
            <motion.div
              className="mt-8 w-full md:max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <form onSubmit={handleSearch} className="flex w-full gap-2 rounded-2xl border bg-card/80 p-2 shadow-sm backdrop-blur">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search for phones, books, gadgets..."
                    className="h-12 rounded-xl border-0 bg-transparent pl-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Button type="submit" className="h-12 rounded-xl px-5" disabled={!search.trim()}>
                  Search
                </Button>
              </form>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link to="/marketplace" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full rounded-2xl bg-primary text-base font-medium text-primary-foreground shadow-lg hover:bg-primary/90 sm:px-8">
                    Explore Marketplace <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/create-listing" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="h-12 w-full rounded-2xl sm:px-8">
                    Sell an Item
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>

          <div className="order-1 flex w-full flex-1 items-center justify-center relative md:order-2">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ duration: 0.8, delay: 0.1 }}
              className="relative w-full max-w-sm"
            >
              <div className="absolute inset-x-8 -bottom-4 h-12 rounded-[100%] bg-black/10 blur-xl" />
              <img 
                src="https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=1000&auto=format&fit=crop" 
                alt="Product Showcase"
                className="relative z-10 mx-auto w-4/5 object-contain mix-blend-multiply drop-shadow-2xl"
              />
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.8, duration: 0.5 }}
                className="absolute right-0 top-1/4 z-20 flex items-center gap-2 rounded-full bg-card/90 px-4 py-2 shadow-xl backdrop-blur-md border"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <span className="text-xs font-bold">+</span>
                </div>
                <span className="text-sm font-medium text-foreground">14 new arrivals</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Value Props */}
        <section className="bg-muted px-4 py-16">
          <div className="container mx-auto">
            <h2 className="text-center font-display text-2xl font-bold md:text-3xl">Why UniMart-FUNAAB?</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-4">
              {[
                { icon: ShieldCheck, title: "Escrow Protection", desc: "Payments held securely until delivery is confirmed via QR code." },
                { icon: CreditCard, title: "Easy Payments", desc: "Pay via Paystack — cards, bank transfer, or USSD. Simple and fast." },
                { icon: Zap, title: "Fast & Easy", desc: "List items in seconds. Find what you need instantly with smart search." },
                { icon: Users, title: "Campus Community", desc: "Connect with fellow students. Chat directly and meet on campus." },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border bg-card p-6 text-center shadow-sm"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">How it works</h2>
            <p className="mt-2 text-muted-foreground">From listing to delivery — quick, safe, and campus-friendly.</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { step: "01", title: "List or search", desc: "Post items in seconds or search what you need across campus." },
              { step: "02", title: "Chat & agree", desc: "Message the seller, confirm the price and meetup location." },
              { step: "03", title: "Pay securely", desc: "Use escrow and confirm delivery with a QR code for protection." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="rounded-2xl border bg-card p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{item.step}</span>
                  <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="container mx-auto px-4 py-16">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">Browse Categories</h2>
              <p className="mt-1 text-sm text-muted-foreground">Find what you need faster.</p>
            </div>
            <Link to="/marketplace">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.value}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Link
                  to={`/marketplace?category=${cat.value}`}
                  className="group relative flex h-full flex-col items-start justify-between gap-3 overflow-hidden rounded-2xl border bg-card/70 p-4 text-left shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30"
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="absolute -left-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,hsl(var(--gold-light)/0.45)_0%,transparent_60%)]" />
                    <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.35)_0%,transparent_60%)]" />
                  </div>

                  <div className="relative flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-background/70 shadow-sm transition-colors group-hover:border-primary/30">
                      <span className="text-2xl">{cat.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-display text-sm font-semibold tracking-tight">{cat.label}</span>
                        <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary sm:inline-block">
                          Browse
                        </span>
                      </div>
                      <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-1">{cat.description}</span>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    Explore <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">⭐ Featured Listings</h2>
            <Link to="/marketplace">
              <Button variant="ghost" size="sm" className="gap-1">
                See all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {loadingFeatured ? (
            <div className="mt-6">
              <ListingGridSkeleton count={4} />
            </div>
          ) : featuredListings && featuredListings.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {featuredListings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={listing.price}
                  images={listing.images}
                  condition={listing.condition}
                  category={listing.category}
                  location={listing.location}
                  isFeatured
                  sellerName={listing.seller_profile?.full_name}
                />
              ))}
            </div>
          ) : (
            <p className="mt-6 text-center text-muted-foreground">No featured listings yet</p>
          )}
        </section>

        {/* Newest */}
        <section className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">🆕 Newest Listings</h2>
            <Link to="/marketplace">
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {loadingNewest ? (
            <div className="mt-6">
              <ListingGridSkeleton count={8} />
            </div>
          ) : newestListings && newestListings.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {newestListings.map((listing: any) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={listing.price}
                  images={listing.images}
                  condition={listing.condition}
                  category={listing.category}
                  location={listing.location}
                  isFeatured={listing.is_featured}
                  sellerName={listing.seller_profile?.full_name}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-4xl">🛒</p>
              <p className="mt-2 text-muted-foreground">No listings yet. Be the first to sell something!</p>
              <Link to="/create-listing">
                <Button className="mt-4">Create a Listing</Button>
              </Link>
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="font-display text-2xl font-bold md:text-3xl">Ready to start trading?</h2>
          <p className="mt-2 text-muted-foreground">Join hundreds of FUNAAB students already on UniMart.</p>
          <Link to="/register"><Button size="lg" className="mt-6 gap-2">Get Started <ArrowRight className="h-4 w-4" /></Button></Link>
        </section>
      </div>
    </PageTransition>
  );
};

export default Index;
