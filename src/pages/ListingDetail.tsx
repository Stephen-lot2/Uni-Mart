import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarRating } from "@/components/StarRating";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, ArrowLeft, MapPin, ShieldCheck, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { BoostListing } from "@/components/BoostListing";
import { MakeOffer } from "@/components/MakeOffer";

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Track recently viewed
  useEffect(() => {
    if (!id) return;
    const prev: string[] = JSON.parse(localStorage.getItem("recently_viewed") || "[]");
    const next = [id, ...prev.filter((x) => x !== id)].slice(0, 10);
    localStorage.setItem("recently_viewed", JSON.stringify(next));
  }, [id]);
  const [activeImage, setActiveImage] = useState(0);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("*").eq("id", id!).single();
      if (!data) return null;
      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", data.seller_id).single();
      return { ...data, seller_profile: profile };
    },
    enabled: !!id,
  });

  const { data: isFavorited } = useQuery({
    queryKey: ["favorite", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.from("favorites").select("id").eq("user_id", user.id).eq("listing_id", id!).maybeSingle();
      return !!data;
    },
    enabled: !!user && !!id,
  });

  const { data: sellerRating } = useQuery({
    queryKey: ["seller-rating", listing?.seller_id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("rating").eq("reviewed_id", listing!.seller_id);
      if (!data || data.length === 0) return { avg: 0, count: 0 };
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg, count: data.length };
    },
    enabled: !!listing?.seller_id,
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user) { navigate("/login"); return; }
      if (isFavorited) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id!);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, listing_id: id! });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorite", id] });
      toast.success(isFavorited ? "Removed from favorites" : "Added to favorites");
    },
  });

  const handleChat = async () => {
    if (!user) { navigate("/login"); return; }
    if (user.id === listing?.seller_id) { toast.error("Can't chat with yourself"); return; }
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(participant_one.eq.${user.id},participant_two.eq.${listing!.seller_id}),and(participant_one.eq.${listing!.seller_id},participant_two.eq.${user.id})`)
      .eq("listing_id", id!)
      .maybeSingle();
    if (existing) {
      navigate(`/chat?conversation=${existing.id}`);
    } else {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert({ participant_one: user.id, participant_two: listing!.seller_id, listing_id: id })
        .select()
        .single();
      if (newConvo) navigate(`/chat?conversation=${newConvo.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-4 h-8 w-20" />
        <div className="grid gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return <div className="container mx-auto px-4 py-20 text-center"><p className="text-4xl">😕</p><p className="mt-2 text-lg">Listing not found</p><Link to="/marketplace"><Button className="mt-4">Back to Marketplace</Button></Link></div>;
  }

  const conditionLabel = listing.condition === "new" ? "Brand New" : "Fairly Used";
  const categoryLabel = listing.category.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
  const isOwnListing = user?.id === listing.seller_id;

  return (
    <PageTransition>
      {/* Outer wrapper — clips everything to viewport width */}
      <div className="w-full max-w-full overflow-x-hidden">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="fixed left-3 top-[4.5rem] z-40 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 shadow-md backdrop-blur border"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* ── MOBILE: single column, image first ── */}
        {/* ── DESKTOP: two-column grid ── */}
        <div className="md:container md:mx-auto md:px-4 md:py-8">
          <div className="grid md:gap-8 md:grid-cols-2">

            {/* Image column */}
            <div className="space-y-3">
              {/* Main image — full bleed on mobile */}
              <div
                className="relative w-full overflow-hidden bg-muted md:rounded-2xl"
                style={{ aspectRatio: "1/1" }}
              >
                {listing.images[activeImage] ? (
                  <img
                    src={listing.images[activeImage]}
                    alt={listing.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    decoding="async"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-6xl">📦</div>
                )}
              </div>

              {/* Thumbnails */}
              {listing.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 px-4 md:px-0">
                  {listing.images.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                        i === activeImage
                          ? "border-primary shadow-md"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" decoding="async" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info column */}
            <div className="px-4 pb-8 md:px-0 md:pb-0">
              {/* Badges */}
              <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
                <Badge variant="outline">{conditionLabel}</Badge>
                <Badge variant="secondary">{categoryLabel}</Badge>
                {listing.is_featured && (
                  <Badge className="bg-secondary text-secondary-foreground">⭐ Featured</Badge>
                )}
              </div>

              {/* Title — clamp on mobile so it doesn't overflow */}
              <h1 className="mt-3 font-display text-2xl font-bold leading-tight break-words md:text-3xl">
                {listing.title}
              </h1>
              <p className="mt-2 text-2xl font-bold text-primary md:text-3xl">
                ₦{listing.price.toLocaleString()}
              </p>

              {listing.location && (
                <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" /> {listing.location}
                </p>
              )}

              <p className="mt-4 whitespace-pre-line break-words text-sm text-foreground/80 md:text-base">
                {listing.description}
              </p>

              {/* Escrow info */}
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/5 p-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Escrow Protected:</strong> Payment is held securely until you confirm delivery.
                </p>
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex flex-wrap gap-2">
                {!isOwnListing && (
                  <Link to={user ? `/checkout/${listing.id}` : "/login"} className="flex-1 min-w-[120px]">
                    <Button className="w-full gap-2">
                      <CreditCard className="h-4 w-4" /> Buy Now
                    </Button>
                  </Link>
                )}
                {!isOwnListing && (
                  <MakeOffer
                    listingId={listing.id}
                    sellerId={listing.seller_id}
                    listingTitle={listing.title}
                    askingPrice={listing.price}
                  />
                )}
                {!isOwnListing && (
                  <Button variant="outline" onClick={handleChat} className="gap-2">
                    <MessageCircle className="h-4 w-4" /> Chat
                  </Button>
                )}
                {isOwnListing && (
                  <BoostListing listingId={listing.id} isFeatured={listing.is_featured} />
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggleFavorite.mutate()}
                  className={isFavorited ? "text-destructive border-destructive" : ""}
                >
                  <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                </Button>
              </div>

              {/* Seller card */}
              {listing.seller_profile && (
                <div className="mt-6 rounded-xl border bg-card p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Seller</h3>
                  <div className="mt-2 flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={listing.seller_profile.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {listing.seller_profile.full_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <Link
                          to={`/profile/${listing.seller_profile.user_id}`}
                          className="font-medium hover:underline truncate"
                        >
                          {listing.seller_profile.full_name}
                        </Link>
                        <VerifiedBadge />
                      </div>
                      {listing.seller_profile.department && (
                        <p className="text-xs text-muted-foreground truncate">
                          {listing.seller_profile.department}
                        </p>
                      )}
                      {sellerRating && sellerRating.count > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <StarRating rating={sellerRating.avg} size="sm" />
                          <span className="text-xs text-muted-foreground">({sellerRating.count})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs text-muted-foreground">
                Listed {new Date(listing.created_at).toLocaleDateString()}
              </p>
            </div>

          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ListingDetail;
