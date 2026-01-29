import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { EntityField, EntityFieldType } from "@/types/entity-fields";
import { FIELD_TYPE_OPTIONS, generateSlug } from "@/types/entity-fields";

interface FieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  field?: EntityField | null;
  entityTable: string;
  onSave: (data: {
    name: string;
    slug: string;
    data_type: EntityFieldType;
    description?: string;
    is_required: boolean;
  }) => void;
}

export function FieldDialog({ 
  open, 
  onOpenChange, 
  field, 
  entityTable,
  onSave 
}: FieldDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [dataType, setDataType] = useState<EntityFieldType>("text");
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  useEffect(() => {
    if (field) {
      setName(field.name);
      setSlug(field.slug);
      setDataType(field.data_type);
      setDescription(field.description || "");
      setIsRequired(field.is_required);
      setSlugManuallyEdited(true);
    } else {
      setName("");
      setSlug("");
      setDataType("text");
      setDescription("");
      setIsRequired(false);
      setSlugManuallyEdited(false);
    }
  }, [field, open]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(generateSlug(value));
    setSlugManuallyEdited(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    
    onSave({
      name: name.trim(),
      slug: slug.trim(),
      data_type: dataType,
      description: description.trim() || undefined,
      is_required: isRequired,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{field ? "Edit Field" : "Add Field"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Field Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., LinkedIn URL, Annual Revenue"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Field Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g., linkedin_url"
              required
            />
            <p className="text-xs text-muted-foreground">
              Internal identifier, auto-generated from name
            </p>
          </div>

          <div className="space-y-3">
            <Label>Data Type *</Label>
            <RadioGroup
              value={dataType}
              onValueChange={(value) => setDataType(value as EntityFieldType)}
              className="grid grid-cols-2 gap-2"
            >
              {FIELD_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex items-center gap-2 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Icon className="h-4 w-4" />
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this field..."
              rows={2}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="required">Required Field</Label>
            <Switch
              id="required"
              checked={isRequired}
              onCheckedChange={setIsRequired}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{field ? "Update" : "Create"} Field</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
