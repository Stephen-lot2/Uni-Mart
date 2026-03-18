import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="font-display text-sm font-bold text-primary-foreground">U</span>
              </div>
              <span className="font-display text-lg font-bold">
                UniMart<span className="text-secondary">-FUNAAB</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              The trusted marketplace for FUNAAB students. Buy, sell, and connect within your campus community.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Quick Links</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/marketplace" className="hover:text-foreground transition-colors">Marketplace</Link>
              <Link to="/create-listing" className="hover:text-foreground transition-colors">Sell an Item</Link>
              <Link to="/favorites" className="hover:text-foreground transition-colors">Favorites</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Categories</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link to="/marketplace?category=electronics" className="hover:text-foreground transition-colors">Electronics</Link>
              <Link to="/marketplace?category=books" className="hover:text-foreground transition-colors">Books</Link>
              <Link to="/marketplace?category=fashion" className="hover:text-foreground transition-colors">Fashion</Link>
              <Link to="/marketplace?category=services" className="hover:text-foreground transition-colors">Services</Link>
            </div>
          </div>
          <div>
            <h4 className="mb-3 font-display font-semibold">Support</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span>Contact Us</span>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} UniMart-FUNAAB. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
