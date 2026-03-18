import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
import { Pencil, Camera, Calendar } from "lucide-react";

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

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
    ? reviews.reduce((s: number, r: Record<string, any>) => s + r.rating, 0) / reviews.length
    : 0;

  const [editForm, setEditForm] = useState({
    full_name: "",
    bio: "",
    department: "",
    level: "",
  });

  useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        department: profile.department || "",
        level: profile.level ? String(profile.level) : "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
          department: editForm.department,
          level: editForm.level ? parseInt(editForm.level) : null,
        })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
      setEditing(false);
    },
    onError: () => toast.error("Failed to update profile"),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    const file = e.target.files[0];
    const path = `${user.id}/avatar.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Avatar updated!");
  };

  if (!profile) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {profile.full_name?.[0]}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border bg-card shadow-sm hover:bg-muted">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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
            {profile.bio && <p className="mt-2 text-sm text-foreground/80">{profile.bio}</p>}
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" /> Joined {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
          {isOwnProfile && (
            <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-1">
              <Pencil className="h-3 w-3" /> Edit
            </Button>
          )}
        </div>

        {/* Edit Form */}
        {editing && isOwnProfile && (
          <div className="mt-4 space-y-4 rounded-xl border bg-card p-6">
            <div>
              <Label>Full Name</Label>
              <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Bio</Label>
              <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} maxLength={300} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Department</Label>
                <Select value={editForm.department} onValueChange={(v) => setEditForm({ ...editForm, department: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Level</Label>
                <Select value={editForm.level} onValueChange={(v) => setEditForm({ ...editForm, level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l} value={String(l)}>{l}L</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => updateProfile.mutate()}>Save Changes</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Listings */}
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold">
            {isOwnProfile ? "Your Listings" : "Listings"} ({listings?.length || 0})
          </h2>
          {listings && listings.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
              {listings.map((listing: Record<string, any>) => (
                <ListingCard
                  key={listing.id}
                  id={listing.id}
                  title={listing.title}
                  price={listing.price}
                  images={listing.images}
                  condition={listing.condition}
                  category={listing.category}
                  location={listing.location}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground">No listings yet.</p>
          )}
        </div>

        {/* Reviews */}
        <div className="mt-8">
          <h2 className="font-display text-xl font-bold">Reviews ({reviews?.length || 0})</h2>
          {reviews && reviews.length > 0 ? (
            <div className="mt-4 space-y-3">
              {reviews.map((review: Record<string, any>) => (
                <div key={review.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={review.profiles?.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                        {review.profiles?.full_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{review.profiles?.full_name}</span>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {review.comment && <p className="mt-2 text-sm text-foreground/80">{review.comment}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-muted-foreground">No reviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
