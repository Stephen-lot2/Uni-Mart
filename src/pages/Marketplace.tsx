import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/ListingCard";
import { ListingGridSkeleton } from "@/components/ListingSkeleton";
import { PageTransition } from "@/components/PageTransition";
import { CATEGORIES } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, SlidersHorizontal, X, ShoppingCart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/store";

const Marketplace = () => {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [condition, setCondition] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const { profile } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", search, category, condition, sortBy, priceRange, page],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      if (search) query = query.ilike("title", `%${search}%`);
      if (category !== "all") query = query.eq("category", category as any);
      if (condition !== "all") query = query.eq("condition", condition as any);
      if (priceRange.min) query = query.gte("price", parseFloat(priceRange.min));
      if (priceRange.max) query = query.lte("price", parseFloat(priceRange.max));

      if (sortBy === "newest") query = query.order("created_at", { ascending: false });
      else if (sortBy === "price_low") query = query.order("price", { ascending: true });
      else if (sortBy === "price_high") query = query.order("price", { ascending: false });

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data: listings, count } = await query;
      if (!listings || listings.length === 0) return { listings: [], total: count || 0 };

      const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", sellerIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

      return {
        listings: listings.map((l) => ({ ...l, seller_profile: profileMap[l.seller_id] })),
        total: count || 0,
      };
    },
  });

  const clearFilters = () => {
    setSearch(""); setCategory("all"); setCondition("all"); setPriceRange({ min: "", max: "" }); setPage(0);
  };

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <PageTransition>
      <div className="container mx-auto px-6 py-6 pb-24 md:pb-8 max-w-7xl">
        {/* Header matching mockup */}
        <div className="flex items-center justify-between mb-8 md:hidden">
          <Link to="/profile">
            <Avatar className="h-10 w-10 border shadow-sm">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {profile?.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link to="/cart" className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm border text-foreground">
            <ShoppingCart className="h-5 w-5" />
          </Link>
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-bold leading-[1.15] mb-8">
          Discover Your<br />
          <span className="italic font-serif font-medium opacity-90">Campus Space</span>
        </h1>

        <div className="mt-6 flex flex-col gap-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search listings..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="h-12 rounded-full pl-12 bg-card border-none shadow-sm font-medium" />
            </div>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={`h-12 w-12 rounded-full shadow-sm border-none bg-card ${showFilters ? "text-primary ring-2 ring-primary ring-offset-2" : ""}`}>
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 rounded-[24px] border bg-card p-5 shadow-sm animate-fade-in">
              <Select value={condition} onValueChange={(v) => { setCondition(v); setPage(0); }}>
                <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Condition" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  <SelectItem value="new">Brand New</SelectItem>
                  <SelectItem value="fairly_used">Fairly Used</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Min ₦" type="number" value={priceRange.min} onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })} className="w-24 rounded-xl" />
              <Input placeholder="Max ₦" type="number" value={priceRange.max} onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })} className="w-24 rounded-xl" />
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 rounded-xl"><X className="h-3 w-3" /> Clear</Button>
            </div>
          )}

          {/* Categories Scrollable Pills */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
             <button onClick={() => setCategory("all")} className={`flex h-11 items-center whitespace-nowrap rounded-full px-6 text-sm font-semibold transition-all shadow-sm ${category === "all" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-card/80"}`}>
               All
             </button>
             {CATEGORIES.map(c => (
               <button key={c.value} onClick={() => setCategory(c.value)} className={`flex h-11 items-center gap-2 whitespace-nowrap rounded-full px-6 text-sm font-semibold transition-all shadow-sm ${category === c.value ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-card/80"}`}>
                 <span className="text-base">{c.icon}</span>
                 {c.label}
               </button>
             ))}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8"><ListingGridSkeleton /></div>
        ) : data?.listings.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-2 text-lg font-medium">No listings found</p>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
              {data?.listings.map((listing: any) => (
                <ListingCard key={listing.id} id={listing.id} title={listing.title} price={listing.price} images={listing.images} condition={listing.condition} category={listing.category} location={listing.location} isFeatured={listing.is_featured} sellerName={listing.seller_profile?.full_name} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-xl">Previous</Button>
                <span className="flex items-center px-3 text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="rounded-xl">Next</Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  );
};

export default Marketplace;
