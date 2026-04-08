import { Home, Store, Heart, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";
import { prefetchRoute } from "@/App";

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = useAuthStore();

  // Unread message count — same query key as Navbar so cache is shared
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .neq("sender_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const navItems = [
    { icon: Home,          label: "Home",    path: "/",            badge: 0, prefetch: null },
    { icon: Store,         label: "Market",  path: "/marketplace", badge: 0, prefetch: prefetchRoute.marketplace },
    { icon: Heart,         label: "Saved",   path: "/favorites",   badge: 0, prefetch: prefetchRoute.favorites },
    { icon: MessageCircle, label: "Chat",    path: "/chat",        badge: unreadCount, prefetch: prefetchRoute.chat },
    { icon: User,          label: "Profile", path: "/profile",     badge: 0, prefetch: prefetchRoute.profile },
  ];

  return (
    <div className="fixed bottom-2 left-0 right-0 z-50 flex justify-center md:hidden px-4">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex w-full max-w-sm items-center justify-between rounded-full border bg-card/70 px-6 py-3 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/60"
      >
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? pathname === "/"
              : pathname === item.path || pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.label}
              to={item.path}
              onMouseEnter={() => item.prefetch?.()}
              onTouchStart={() => item.prefetch?.()}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/50"
                }`}
              >
                <item.icon className="h-5 w-5" />

                {/* Unread badge */}
                {item.badge > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white shadow-sm">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
