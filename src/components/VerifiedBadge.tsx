import { ShieldCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-0.5 text-primary">
          <ShieldCheck className={iconSize} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Verified Student Seller</p>
      </TooltipContent>
    </Tooltip>
  );
}
