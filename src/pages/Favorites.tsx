import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { ListingCard } from "@/components/ListingCard";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft } from "lucide-react";
import { SkeletonGrid } from "@/components/PageLoader";
import { PageTransition } from "@/components/PageTransition";

const Favorites = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) { navigate("/login"); return null; }

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["favorites", user.id],
    queryFn: async () => {
      const { data: favs } = await supabase
        .from("favorites")
        .select("listing_id")
        .eq("user_id", user.id);
      if (!favs || favs.length === 0) return [];
      const listingIds = favs.map((f) => f.listing_id);
      const { data: listings } = await supabase
        .from("listings")
        .select("*")
        .in("id", listingIds)
        .eq("is_active", true);
      return listings || [];
    },
  });

  return (
    <PageTransition>
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold">Favorites</h1>
          <p className="text-sm text-muted-foreground">Items you've saved for later</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8">
          <SkeletonGrid count={8} />
        </div>
      ) : favorites && favorites.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {favorites.map((listing: any) => (
            <ListingCard key={listing.id} id={listing.id} title={listing.title} price={listing.price} images={listing.images} condition={listing.condition} category={listing.category} location={listing.location} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-4xl">💛</p>
          <p className="mt-2 text-lg font-medium">No favorites yet</p>
          <p className="text-muted-foreground">Start saving items you like!</p>
          <Link to="/marketplace"><Button className="mt-4">Browse Marketplace</Button></Link>
        </div>
      )}
    </div>
    </PageTransition>
  );
};

export default Favorites;
