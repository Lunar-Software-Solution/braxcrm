import { Edit, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EntityField } from "@/types/entity-fields";
import { getFieldTypeOption } from "@/types/entity-fields";

interface FieldRowProps {
  field: EntityField;
  onEdit: (field: EntityField) => void;
  onDelete: (field: EntityField) => void;
}

export function FieldRow({ field, onEdit, onDelete }: FieldRowProps) {
  const typeOption = getFieldTypeOption(field.data_type);
  const Icon = typeOption.icon;

  return (
    <div className="group flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/50 transition-colors">
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{field.name}</span>
            {field.is_required && (
              <Badge variant="outline" className="text-xs">Required</Badge>
            )}
          </div>
          {field.description && (
            <p className="text-sm text-muted-foreground truncate">{field.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="text-xs">
          Managed
        </Badge>
        
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{typeOption.label}</span>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(field)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(field)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
