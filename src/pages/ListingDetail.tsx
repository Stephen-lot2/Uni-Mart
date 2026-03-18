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
import { useState } from "react";

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              {listing.images[activeImage] ? (
                <img src={listing.images[activeImage]} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl">📦</div>
              )}
            </div>
            {listing.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {listing.images.map((img: string, i: number) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${i === activeImage ? "border-primary shadow-md" : "border-transparent opacity-70 hover:opacity-100"}`}>
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex gap-2">
              <Badge variant="outline">{conditionLabel}</Badge>
              <Badge variant="secondary">{categoryLabel}</Badge>
              {listing.is_featured && <Badge className="bg-secondary text-secondary-foreground">⭐ Featured</Badge>}
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold">{listing.title}</h1>
            <p className="mt-2 text-3xl font-bold text-primary">₦{listing.price.toLocaleString()}</p>
            {listing.location && <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-4 w-4" /> {listing.location}</p>}
            <p className="mt-4 whitespace-pre-line text-foreground/80">{listing.description}</p>

            {/* Escrow info */}
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary/5 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Escrow Protected:</strong> Payment is held securely until you confirm delivery.
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              {!isOwnListing && (
                <Link to={user ? `/checkout/${listing.id}` : "/login"} className="flex-1">
                  <Button className="w-full gap-2">
                    <CreditCard className="h-4 w-4" /> Buy Now
                  </Button>
                </Link>
              )}
              <Button variant="outline" onClick={handleChat} className="gap-2 flex-1">
                <MessageCircle className="h-4 w-4" /> Chat
              </Button>
              <Button variant="outline" size="icon" onClick={() => toggleFavorite.mutate()} className={isFavorited ? "text-destructive border-destructive" : ""}>
                <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
              </Button>
            </div>
            {listing.seller_profile && (
              <div className="mt-6 rounded-xl border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Seller</h3>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={listing.seller_profile.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">{listing.seller_profile.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <Link to={`/profile/${listing.seller_profile.user_id}`} className="font-medium hover:underline">{listing.seller_profile.full_name}</Link>
                      <VerifiedBadge />
                    </div>
                    {listing.seller_profile.department && <p className="text-xs text-muted-foreground">{listing.seller_profile.department}</p>}
                    {sellerRating && sellerRating.count > 0 && (
                      <div className="flex items-center gap-1 mt-1"><StarRating rating={sellerRating.avg} size="sm" /><span className="text-xs text-muted-foreground">({sellerRating.count})</span></div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">Listed {new Date(listing.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ListingDetail;
