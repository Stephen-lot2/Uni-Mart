import { Home, Store, Heart, MessageCircle, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Store, label: "Market", path: "/marketplace" },
    { icon: Heart, label: "Saved", path: "/favorites" },
    { icon: MessageCircle, label: "Chat", path: "/chat" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center md:hidden px-4">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex w-full max-w-sm items-center justify-between rounded-full border bg-card/70 px-6 py-3 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/60"
      >
        {navItems.map((item) => {
          const isActive =
            item.path === "/" ? pathname === "/" : pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center gap-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "hover:bg-muted/50"
                }`}
              >
                <item.icon className="h-5 w-5" />
              </div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
