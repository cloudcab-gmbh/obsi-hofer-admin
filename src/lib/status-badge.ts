import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

// Gleiche Normalisierung wie im Kundenportal-Repo, damit ein Status-Wert
// überall dieselbe Farbe bekommt.
export function getStatusBadgeVariant(status: string | null): BadgeVariant {
  if (!status) return "secondary";

  switch (status.trim().toLowerCase()) {
    case "freigabe":
      return "success";
    case "keine freigabe":
      return "destructive";
    case "letzte freigabe":
      return "warning";
    default:
      return "secondary";
  }
}
