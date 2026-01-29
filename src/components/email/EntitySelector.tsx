import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ENTITY_AUTOMATION_CONFIG, ENTITY_TABLES, type EntityTable } from "@/types/entity-automation";
import * as LucideIcons from "lucide-react";

interface EntitySelectorProps {
  selectedEntityTable: string | null;
  onSelect: (entityTable: string) => void;
  disabled?: boolean;
}

export function EntitySelector({
  selectedEntityTable,
  onSelect,
  disabled = false,
}: EntitySelectorProps) {
  const getIcon = (iconName: string) => {
    const IconComponent = LucideIcons[iconName as keyof typeof LucideIcons] as React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    return IconComponent || LucideIcons.Tag;
  };

  const selectedConfig = selectedEntityTable 
    ? ENTITY_AUTOMATION_CONFIG[selectedEntityTable] 
    : null;

  return (
    <Select
      value={selectedEntityTable || undefined}
      onValueChange={onSelect}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px] h-8 text-xs">
        {selectedConfig ? (
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = getIcon(selectedConfig.icon);
              return <Icon className="h-3.5 w-3.5" style={{ color: selectedConfig.color }} />;
            })()}
            <span className="truncate">{selectedConfig.label}</span>
          </div>
        ) : (
          <SelectValue placeholder="Select entity..." />
        )}
      </SelectTrigger>
      <SelectContent className="bg-background border shadow-lg z-50">
        {ENTITY_TABLES.map((entityTable) => {
          const config = ENTITY_AUTOMATION_CONFIG[entityTable];
          if (!config) return null;
          const Icon = getIcon(config.icon);
          return (
            <SelectItem key={entityTable} value={entityTable}>
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                <span>{config.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
