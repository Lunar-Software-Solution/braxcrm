import { format } from "date-fns";
import { ExternalLink, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EntityField, EntityFieldValue } from "@/types/entity-fields";

interface DynamicFieldViewProps {
  field: EntityField;
  value?: EntityFieldValue;
}

export function DynamicFieldView({ field, value }: DynamicFieldViewProps) {
  if (!value) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  switch (field.data_type) {
    case 'text':
      return <span>{value.value_text || "—"}</span>;

    case 'number':
      return <span>{value.value_number?.toLocaleString() ?? "—"}</span>;

    case 'currency':
      const currency = (field.config?.currency as string) || 'USD';
      const currencySymbol = (field.config?.symbol as string) || '$';
      return (
        <span>
          {value.value_number != null
            ? `${currencySymbol}${value.value_number.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "—"}
        </span>
      );

    case 'link':
      if (!value.value_text) return <span className="text-muted-foreground">—</span>;
      return (
        <a
          href={value.value_text}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          {value.value_text.replace(/^https?:\/\//, '').substring(0, 30)}
          <ExternalLink className="h-3 w-3" />
        </a>
      );

    case 'boolean':
      return (
        <Badge variant={value.value_boolean ? "default" : "secondary"}>
          {value.value_boolean ? (
            <><Check className="h-3 w-3 mr-1" /> Yes</>
          ) : (
            <><X className="h-3 w-3 mr-1" /> No</>
          )}
        </Badge>
      );

    case 'date':
      if (!value.value_date) return <span className="text-muted-foreground">—</span>;
      return <span>{format(new Date(value.value_date), "PPP")}</span>;

    case 'datetime':
      if (!value.value_date) return <span className="text-muted-foreground">—</span>;
      return <span>{format(new Date(value.value_date), "PPP p")}</span>;

    case 'address':
      if (!value.value_json) return <span className="text-muted-foreground">—</span>;
      const addr = value.value_json as Record<string, string>;
      const parts = [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean);
      return <span>{parts.join(', ') || "—"}</span>;

    case 'actor':
      // TODO: Fetch and display user info
      return <span>{value.value_text || "—"}</span>;

    default:
      return <span className="text-muted-foreground">—</span>;
  }
}
