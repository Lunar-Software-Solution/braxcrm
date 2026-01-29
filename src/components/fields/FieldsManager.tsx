import { useState } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEntityFields } from "@/hooks/use-entity-fields";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FieldRow } from "./FieldRow";
import { FieldDialog } from "./FieldDialog";
import type { EntityField, EntityFieldType } from "@/types/entity-fields";
import { ENTITY_TABLE_LABELS } from "@/types/entity-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FieldsManagerProps {
  entityTable: string;
}

export function FieldsManager({ entityTable }: FieldsManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<EntityField | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<EntityField | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { fields, isLoading, createField, updateField, deleteField } = useEntityFields(entityTable);

  const filteredFields = fields.filter(field =>
    field.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    field.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (data: {
    name: string;
    slug: string;
    data_type: EntityFieldType;
    description?: string;
    is_required: boolean;
  }) => {
    if (!user) return;

    try {
      if (editingField) {
        await updateField.mutateAsync({
          id: editingField.id,
          data: {
            name: data.name,
            slug: data.slug,
            data_type: data.data_type,
            description: data.description || null,
            is_required: data.is_required,
          },
        });
        toast({ title: "Field updated" });
      } else {
        await createField.mutateAsync({
          entity_table: entityTable,
          name: data.name,
          slug: data.slug,
          data_type: data.data_type,
          description: data.description,
          is_required: data.is_required,
          created_by: user.id,
        });
        toast({ title: "Field created" });
      }
      setEditingField(null);
    } catch (error) {
      toast({
        title: "Failed to save field",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (field: EntityField) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  const handleDeleteClick = (field: EntityField) => {
    setFieldToDelete(field);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fieldToDelete) return;
    try {
      await deleteField.mutateAsync(fieldToDelete.id);
      toast({ title: "Field deleted" });
      setDeleteDialogOpen(false);
      setFieldToDelete(null);
    } catch (error) {
      toast({
        title: "Failed to delete field",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const entityLabel = ENTITY_TABLE_LABELS[entityTable] || entityTable;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold">Fields</h1>
            <p className="text-sm text-muted-foreground">
              Manage custom fields for {entityLabel}
            </p>
          </div>
          <Button onClick={() => { setEditingField(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fields List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Loading fields...</p>
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-muted-foreground">
              {searchQuery ? "No fields match your search" : "No custom fields yet"}
            </p>
            {!searchQuery && (
              <Button
                variant="link"
                onClick={() => { setEditingField(null); setDialogOpen(true); }}
              >
                Add your first field
              </Button>
            )}
          </div>
        ) : (
          <div>
            {/* Table Header */}
            <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="w-4" /> {/* Grip placeholder */}
              <div className="flex-1">Name</div>
              <div className="w-20">App</div>
              <div className="w-24">Data Type</div>
              <div className="w-16" /> {/* Actions placeholder */}
            </div>
            
            {filteredFields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Field Dialog */}
      <FieldDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        field={editingField}
        entityTable={entityTable}
        onSave={handleSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fieldToDelete?.name}"? This will also delete all values stored for this field. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
