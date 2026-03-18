import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export function StarRating({ rating, maxRating = 5, size = "md", interactive = false, onRate }: StarRatingProps) {
  const sizeClass = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-6 w-6" }[size];

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClass,
            i < Math.round(rating)
              ? "fill-secondary text-secondary"
              : "text-muted-foreground/30",
            interactive && "cursor-pointer hover:text-secondary transition-colors"
          )}
          onClick={() => interactive && onRate?.(i + 1)}
        />
      ))}
    </div>
  );
}
