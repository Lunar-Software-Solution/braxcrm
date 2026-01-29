import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { EntityField, EntityFieldValue } from "@/types/entity-fields";

interface DynamicFieldProps {
  field: EntityField;
  value?: EntityFieldValue;
  onChange: (value: string | number | boolean | Date | Record<string, unknown> | null) => void;
  disabled?: boolean;
}

export function DynamicField({ field, value, onChange, disabled }: DynamicFieldProps) {
  const [localValue, setLocalValue] = useState<string>("");

  useEffect(() => {
    if (value) {
      switch (field.data_type) {
        case 'text':
        case 'link':
        case 'actor':
          setLocalValue(value.value_text || "");
          break;
        case 'number':
        case 'currency':
          setLocalValue(value.value_number?.toString() || "");
          break;
        case 'date':
        case 'datetime':
          setLocalValue(value.value_date || "");
          break;
        default:
          setLocalValue("");
      }
    } else {
      setLocalValue("");
    }
  }, [value, field.data_type]);

  const handleChange = (newValue: string | number | boolean | Date | null) => {
    onChange(newValue);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    handleChange(val || null);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    handleChange(val ? parseFloat(val) : null);
  };

  switch (field.data_type) {
    case 'text':
      return (
        <Input
          value={localValue}
          onChange={handleTextChange}
          placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
          disabled={disabled}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={localValue}
          onChange={handleNumberChange}
          placeholder={field.description || `Enter ${field.name.toLowerCase()}`}
          disabled={disabled}
        />
      );

    case 'currency':
      return (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {(field.config?.currency as string) || '$'}
          </span>
          <Input
            type="number"
            step="0.01"
            value={localValue}
            onChange={handleNumberChange}
            className="pl-7"
            placeholder="0.00"
            disabled={disabled}
          />
        </div>
      );

    case 'link':
      return (
        <Input
          type="url"
          value={localValue}
          onChange={handleTextChange}
          placeholder="https://..."
          disabled={disabled}
        />
      );

    case 'boolean':
      return (
        <Switch
          checked={value?.value_boolean || false}
          onCheckedChange={(checked) => handleChange(checked)}
          disabled={disabled}
        />
      );

    case 'date':
    case 'datetime':
      const dateValue = localValue ? new Date(localValue) : undefined;
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateValue && "text-muted-foreground"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateValue ? format(dateValue, field.data_type === 'datetime' ? "PPP p" : "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(date) => handleChange(date || null)}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      );

    case 'address':
      // Simplified address input - could be expanded to full address form
      return (
        <Input
          value={localValue}
          onChange={handleTextChange}
          placeholder="Enter address..."
          disabled={disabled}
        />
      );

    case 'actor':
      // TODO: Implement user selector
      return (
        <Input
          value={localValue}
          onChange={handleTextChange}
          placeholder="Select user..."
          disabled={disabled}
        />
      );

    default:
      return (
        <Input
          value={localValue}
          onChange={handleTextChange}
          disabled={disabled}
        />
      );
  }
}
