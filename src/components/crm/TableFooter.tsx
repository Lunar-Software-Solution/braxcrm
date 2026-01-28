import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Aggregation {
  label: string;
  value: string | number;
}

interface TableFooterProps {
  aggregations: Aggregation[];
  onCalculate?: () => void;
}

export function TableFooter({ aggregations, onCalculate }: TableFooterProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 border-t bg-muted/30">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <Calculator className="h-4 w-4" />
            Calculate
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-popover z-50">
          <DropdownMenuItem>Count all</DropdownMenuItem>
          <DropdownMenuItem>Count unique</DropdownMenuItem>
          <DropdownMenuItem>Count empty</DropdownMenuItem>
          <DropdownMenuItem>Count not empty</DropdownMenuItem>
          <DropdownMenuItem>Max</DropdownMenuItem>
          <DropdownMenuItem>Min</DropdownMenuItem>
          <DropdownMenuItem>Average</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <div className="flex items-center gap-2 flex-wrap">
        {aggregations.map((agg, index) => (
          <Badge key={index} variant="secondary" className="font-normal">
            {agg.label}: {agg.value}
          </Badge>
        ))}
      </div>
    </div>
  );
}
