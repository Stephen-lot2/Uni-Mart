import { Link } from "react-router-dom";
import { ShieldCheck, Zap, Users } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-card/50 backdrop-blur">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30">
              <span className="font-display text-lg font-black text-primary-foreground">C</span>
              </div>
              <span className="font-display text-xl font-black tracking-tight">CampusMart</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
              The trusted campus marketplace. Buy, sell, and connect within your campus community.
            </p>
            {/* trust badges */}
            <div className="mt-5 flex flex-wrap gap-3">
              {[
                { icon: ShieldCheck, label: "Escrow Protected" },
                { icon: Zap, label: "Fast Delivery" },
                { icon: Users, label: "Student Community" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Icon className="h-3 w-3 text-primary" /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-foreground">Marketplace</h4>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link to="/marketplace" className="hover:text-foreground transition-colors">Browse All</Link>
              <Link to="/marketplace?category=electronics" className="hover:text-foreground transition-colors">Electronics</Link>
              <Link to="/marketplace?category=books" className="hover:text-foreground transition-colors">Books</Link>
              <Link to="/marketplace?category=fashion" className="hover:text-foreground transition-colors">Fashion</Link>
              <Link to="/marketplace?category=services" className="hover:text-foreground transition-colors">Services</Link>
            </div>
          </div>

          {/* Account */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-foreground">Account</h4>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link to="/profile" className="hover:text-foreground transition-colors">Profile</Link>
              <Link to="/orders" className="hover:text-foreground transition-colors">Orders</Link>
              <Link to="/wallet" className="hover:text-foreground transition-colors">Wallet</Link>
              <Link to="/favorites" className="hover:text-foreground transition-colors">Favorites</Link>
              <Link to="/create-listing" className="hover:text-foreground transition-colors">Sell an Item</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-sm font-bold text-foreground">Support</h4>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link to="/chat" className="hover:text-foreground transition-colors">Contact Us</Link>
              <Link to="/settings" className="hover:text-foreground transition-colors">Settings</Link>
              <span className="cursor-pointer hover:text-foreground transition-colors">Privacy Policy</span>
              <span className="cursor-pointer hover:text-foreground transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} CampusMart. All rights reserved.</p>
          <p>Made with ❤️ for students</p>
        </div>
      </div>
    </footer>
  );
}

