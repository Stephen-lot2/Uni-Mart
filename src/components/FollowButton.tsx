import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  sellerId: string;
}

export function FollowButton({ sellerId }: Props) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ["following", user?.id, sellerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", sellerId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!sellerId,
  });

  const { data: followerCount } = useQuery({
    queryKey: ["follower-count", sellerId],
    queryFn: async () => {
      const { count } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", sellerId);
      return count || 0;
    },
    enabled: !!sellerId,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) { navigate("/login"); return; }
      if (isFollowing) {
        await supabase.from("follows").delete()
          .eq("follower_id", user.id).eq("following_id", sellerId);
      } else {
        await supabase.from("follows").insert({ follower_id: user.id, following_id: sellerId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following", user?.id, sellerId] });
      queryClient.invalidateQueries({ queryKey: ["follower-count", sellerId] });
      toast.success(isFollowing ? "Unfollowed" : "Following! You'll be notified of new listings.");
    },
    onError: () => toast.error("Something went wrong"),
  });

  if (!user || user.id === sellerId) return null;

  return (
    <div className="flex items-center gap-2">
      {followerCount !== undefined && followerCount > 0 && (
        <span className="text-xs text-muted-foreground">{followerCount} follower{followerCount !== 1 ? "s" : ""}</span>
      )}
      <Button
        variant={isFollowing ? "outline" : "default"}
        size="sm"
        onClick={() => toggle.mutate()}
        disabled={isLoading || toggle.isPending}
        className="gap-1.5 rounded-xl"
      >
        {toggle.isPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : isFollowing
          ? <UserCheck className="h-3.5 w-3.5" />
          : <UserPlus className="h-3.5 w-3.5" />
        }
        {isFollowing ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
