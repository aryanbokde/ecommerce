import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Color per order status. Reusable across customer + admin views.
// Palette-aligned: matches OrderStatusDonut (pending→sky · confirmed→blue ·
// processing→yellow · shipped→orange · delivered→green · cancelled→red).
// Fixed light-chip pairs so contrast holds in both light and dark themes.
const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-sky-100 text-sky-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-amber-100 text-amber-700",
  shipped: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-muted text-muted-foreground",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      // tailwind-merge lets these bg/text utilities override the default variant.
      className={cn(
        "border-transparent capitalize",
        STATUS_CLASSES[status] ?? "bg-muted text-muted-foreground",
        className
      )}
    >
      {status}
    </Badge>
  );
}
