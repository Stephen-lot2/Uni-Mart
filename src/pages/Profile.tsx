import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListingCard } from "@/components/ListingCard";
import { StarRating } from "@/components/StarRating";
import { DEPARTMENTS, LEVELS } from "@/lib/constants";
import { toast } from "sonner";
import { Pencil, Camera, Calendar, Loader2, Trash2, X, ArrowLeft } from "lucide-react";
import { compressAvatarToBase64 } from "@/lib/imageUpload";
import { ProfileSkeleton } from "@/components/PageLoader";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { FollowButton } from "@/components/FollowButton";
import { ReferralCard } from "@/components/ReferralCard";

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, setProfile: setStoreProfile } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = userId || user?.id;

  const { data: profile } = useQuery({
    queryKey: ["profile", targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", targetUserId!)
        .single();
      return data;
    },
    enabled: !!targetUserId,
  });

  const { data: listings } = useQuery({
    queryKey: ["user-listings", targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", targetUserId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const { data: reviews } = useQuery({
    queryKey: ["user-reviews", targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, profiles!reviews_reviewer_id_fkey(full_name, avatar_url)")
        .eq("reviewed_id", targetUserId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!targetUserId,
  });

  const avgRating = reviews && reviews.length > 0
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length
    : 0;

  const [editForm, setEditForm] = useState({
    full_name: "",
    username: "",
    bio: "",
    department: "",
    level: "",
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
        department: profile.department || "",
        level: profile.level ? String(profile.level) : "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          username: editForm.username.trim().toLowerCase(),
          bio: editForm.bio,
          department: editForm.department || null,
          level: editForm.level ? parseInt(editForm.level) : null,
        })
        .eq("user_id", user!.id)
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("That username is already taken");
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      setStoreProfile(data);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
      setEditing(false);
    },
    onError: (err: any) => toast.error(`Failed to update profile: ${err.message}`),
  });

  const deleteListing = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("listings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-listings"] });
      toast.success("Listing deleted");
    },
    onError: (err: any) => toast.error(`Failed to delete: ${err.message}`),
  });

  const handleDelete = (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    deleteListing.mutate(id);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    const file = e.target.files[0];

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }

    setAvatarUploading(true);

    try {
      const dataUrl = await compressAvatarToBase64(file, 300, 0.8);

      const { data: updatedProfile, error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        toast.error(`Failed to save avatar: ${error.message}`);
      } else {
        setStoreProfile(updatedProfile);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        toast.success("Avatar updated!");
      }
    } catch {
      toast.error("Could not process image");
    }

    setAvatarUploading(false);
    e.target.value = "";
  };

  if (!profile) {
    return <ProfileSkeleton />;
  }

  return (
    <PageTransition>
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back button — only on other people's profiles */}
        {!isOwnProfile && (
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-8 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <button
              onClick={() => profile.avatar_url && setPreviewOpen(true)}
              className={`rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 ${profile.avatar_url ? "cursor-zoom-in" : "cursor-default"}`}
              aria-label="Preview profile picture"
            >
              <Avatar className="h-24 w-24 ring-4 ring-primary/10">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                  {profile.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
            </button>
            {isOwnProfile && (
              <label className={`absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-card shadow-md hover:bg-muted transition-colors ${avatarUploading ? "pointer-events-none" : ""}`}>
                {avatarUploading
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Camera className="h-3.5 w-3.5" />
                }
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl font-bold">{profile.full_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.department && (
              <p className="mt-1 text-sm text-muted-foreground">
                {profile.department} {profile.level ? `• ${profile.level}L` : ""}
              </p>
            )}
            <div className="mt-2 flex items-center justify-center gap-2 sm:justify-start">
              <StarRating rating={avgRating} size="sm" />
              <span className="text-xs text-muted-foreground">
                {avgRating.toFixed(1)} ({reviews?.length || 0} reviews)
              </span>
            </div>
            {profile.bio && <p className="mt-2 text-sm text-foreground/80 max-w-md">{profile.bio}</p>}
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground justify-center sm:justify-start">
              <Calendar className="h-3 w-3" /> Joined {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-1.5 rounded-xl shrink-0">
              <Pencil className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          )}
          {!isOwnProfile && (
            <FollowButton sellerId={profile.user_id} />
          )}
        </div>

        {/* Edit Form */}
        {editing && isOwnProfile && (
          <div className="mt-4 space-y-4 rounded-2xl border bg-card p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Username</Label>
                <Input
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.replace(/\s/g, "").toLowerCase() })}
                  placeholder="e.g. johndoe"
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Bio</Label>
                <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} maxLength={300} className="mt-1" />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={editForm.department} onValueChange={(v) => setEditForm({ ...editForm, department: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={editForm.level} onValueChange={(v) => setEditForm({ ...editForm, level: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={String(l)}>{l}L</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="rounded-xl">
                {updateProfile.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} className="rounded-xl">Cancel</Button>
            </div>
          </div>
        )}

        {/* Two-column desktop layout */}
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {/* Listings — takes 2/3 */}
          <div className="md:col-span-2">
            <h2 className="font-display text-xl font-bold mb-4">
              {isOwnProfile ? "Your Listings" : "Listings"}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({listings?.length || 0})</span>
            </h2>
            {listings && listings.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {listings.map((listing: any) => (
                  <div key={listing.id} className="relative">
                    <ListingCard
                      id={listing.id} title={listing.title} price={listing.price}
                      images={listing.images} condition={listing.condition}
                      category={listing.category} location={listing.location}
                    />
                    {isOwnProfile && (
                      <button
                        onClick={() => handleDelete(listing.id)}
                        disabled={deleteListing.isPending}
                        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border bg-muted/20 py-16 text-center">
                <p className="text-4xl">📦</p>
                <p className="mt-2 text-muted-foreground">No listings yet.</p>
              </div>
            )}
          </div>

          {/* Reviews — takes 1/3 */}
          <div>
            {isOwnProfile && <div className="mb-6"><ReferralCard /></div>}
            <h2 className="font-display text-xl font-bold mb-4">
              Reviews
              <span className="ml-2 text-sm font-normal text-muted-foreground">({reviews?.length || 0})</span>
            </h2>            {reviews && reviews.length > 0 ? (
              <div className="space-y-3">
                {reviews.map((review: any) => (
                  <div key={review.id} className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={review.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {review.profiles?.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{review.profiles?.full_name}</p>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                    {review.comment && <p className="mt-2 text-sm text-foreground/80">{review.comment}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border bg-muted/20 py-10 text-center">
                <p className="text-3xl">⭐</p>
                <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Avatar lightbox */}
      <AnimatePresence>
        {previewOpen && profile.avatar_url && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="relative max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full rounded-3xl object-cover shadow-2xl"
              />
              <button
                onClick={() => setPreviewOpen(false)}
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-lg hover:bg-muted transition-colors"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default Profile;
