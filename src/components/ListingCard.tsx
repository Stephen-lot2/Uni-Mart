import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface ListingCardProps {
  id: string;
  title: string;
  price: number;
  images: string[];
  condition: string;
  category: string;
  location?: string;
  isFeatured?: boolean;
  sellerName?: string;
}

export function ListingCard({
  id,
  title,
  price,
  images,
  condition,
  category,
  location,
  isFeatured,
  sellerName,
}: ListingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Link to={`/listing/${id}`} className="group block h-full">
        <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border bg-card/70 p-3 shadow-sm backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute -left-12 -top-12 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,hsl(var(--gold-light)/0.35)_0%,transparent_60%)]" />
            <div className="absolute -right-12 -bottom-12 h-28 w-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.25)_0%,transparent_60%)]" />
          </div>

          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/40 flex items-center justify-center">
            {images[0] ? (
              <img
                src={images[0]}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl text-muted-foreground">📦</div>
            )}
            {isFeatured && (
              <Badge className="absolute left-2 top-2 bg-secondary/95 text-secondary-foreground text-xs py-0 px-2 rounded-md shadow-sm">
                ⭐ Featured
              </Badge>
            )}
          </div>
          
          <div className="relative mt-3 flex flex-col pb-1">
            <h3 className="line-clamp-1 font-display text-[15px] font-semibold text-foreground pr-10 tracking-tight">{title}</h3>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-base font-bold text-foreground">₦{price.toLocaleString()}</span>
              {/* Simulated struck-through old price to match mockup feel */}
              <span className="text-xs text-muted-foreground line-through">₦{(price * 1.2).toLocaleString()}</span>
            </div>
            {(sellerName || location) && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                {sellerName && <span className="max-w-[10rem] truncate">{sellerName}</span>}
                {sellerName && location && <span>•</span>}
                {location && <span className="truncate">{location}</span>}
              </div>
            )}
          </div>
          
          <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105">
            <ShoppingCart className="h-4 w-4" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
