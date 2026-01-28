import { Plus } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";

interface AddNewRowProps {
  colSpan: number;
  onClick: () => void;
  label?: string;
}

export function AddNewRow({ colSpan, onClick, label = "Add New" }: AddNewRowProps) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 border-b"
      onClick={onClick}
    >
      <TableCell colSpan={colSpan} className="py-2">
        <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <Plus className="h-4 w-4" />
          <span className="text-sm">{label}</span>
        </div>
      </TableCell>
    </TableRow>
  );
}
