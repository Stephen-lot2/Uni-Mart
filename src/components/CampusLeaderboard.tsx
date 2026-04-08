import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const MEDAL = ["🥇", "🥈", "🥉"];

export function CampusLeaderboard() {
  const { data: sellers, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      // Get completed orders from the last 30 days grouped by seller
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: orders } = await supabase
        .from("orders")
        .select("seller_id, amount")
        .eq("status", "completed")
        .gte("created_at", since);

      if (!orders?.length) return [];

      // Aggregate by seller
      const map: Record<string, { sales: number; revenue: number }> = {};
      orders.forEach((o) => {
        if (!map[o.seller_id]) map[o.seller_id] = { sales: 0, revenue: 0 };
        map[o.seller_id].sales += 1;
        map[o.seller_id].revenue += Number(o.amount);
      });

      const sorted = Object.entries(map)
        .sort((a, b) => b[1].sales - a[1].sales)
        .slice(0, 5);

      if (!sorted.length) return [];

      const ids = sorted.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, department")
        .in("user_id", ids);

      const pm = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));

      return sorted.map(([id, stats], i) => ({
        rank: i + 1,
        profile: pm[id],
        ...stats,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!isLoading && (!sellers || sellers.length === 0)) return null;

  return (
    <section className="px-5 pb-10 md:px-12 xl:px-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-center gap-2 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold leading-tight">Campus Leaderboard</h2>
            <p className="text-xs text-muted-foreground">Top sellers this month</p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Last 30 days
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
              ))
            : sellers!.map((seller, i) => (
                <motion.div
                  key={seller.profile?.user_id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                >
                  <Link
                    to={`/profile/${seller.profile?.user_id}`}
                    className={`flex items-center gap-3 rounded-2xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                      i === 0 ? "border-yellow-400/40 bg-yellow-50/50 dark:bg-yellow-900/10" : "bg-card"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={seller.profile?.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                          {seller.profile?.full_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -right-1 -top-1 text-base leading-none">
                        {MEDAL[i] || `#${seller.rank}`}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {seller.profile?.full_name || "Unknown"}
                      </p>
                      {seller.profile?.department && (
                        <p className="truncate text-[11px] text-muted-foreground">{seller.profile.department}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">{seller.sales} sold</span>
                        <span className="text-[10px] text-muted-foreground">
                          ₦{Number(seller.revenue).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
        </div>
      </div>
    </section>
  );
}
