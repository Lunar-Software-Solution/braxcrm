import { useState } from "react";
import { Plus, Edit, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableHeader as CRMTableHeader } from "@/components/crm/TableHeader";
import { useEntities } from "@/hooks/use-entities";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Entity, EntityType } from "@/types/entities";
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

interface EntityListProps {
  entityType: EntityType;
  title: string;
  singularTitle: string;
  color: string;
}

export default function EntityList({ entityType, title, singularTitle, color }: EntityListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { list, isLoading, create, update, delete: deleteEntity } = useEntities(entityType);

  const handleSave = async (formData: FormData) => {
    if (!user) return;
    try {
      const data = {
        name: formData.get("name") as string,
        email: (formData.get("email") as string) || null,
        phone: (formData.get("phone") as string) || null,
        notes: (formData.get("notes") as string) || null,
      };

      if (editingEntity) {
        await update({ id: editingEntity.id, data });
        toast({ title: `${singularTitle} updated` });
      } else {
        await create({
          ...data,
          created_by: user.id,
        });
        toast({ title: `${singularTitle} created` });
      }

      setDialogOpen(false);
      setEditingEntity(null);
    } catch (error) {
      toast({
        title: `Failed to save ${singularTitle.toLowerCase()}`,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!entityToDelete) return;
    try {
      await deleteEntity(entityToDelete.id);
      toast({ title: `${singularTitle} deleted` });
      setDeleteDialogOpen(false);
      setEntityToDelete(null);
    } catch (error) {
      toast({
        title: `Failed to delete ${singularTitle.toLowerCase()}`,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const openEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setDialogOpen(true);
  };

  const openDelete = (entity: Entity) => {
    setEntityToDelete(entity);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <CRMTableHeader title={title} count={list.length} />

      <div className="flex-1 overflow-hidden p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading {title.toLowerCase()}...</p>
          </div>
        ) : !user ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Please log in to view {title.toLowerCase()}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No {title.toLowerCase()} yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first {singularTitle.toLowerCase()} to get started
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add {singularTitle}
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((entity) => (
                <Card key={entity.id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <CardTitle className="text-base">{entity.name}</CardTitle>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(entity)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => openDelete(entity)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {entity.email && (
                      <CardDescription className="line-clamp-1">
                        {entity.email}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    {entity.phone && (
                      <p className="text-sm text-muted-foreground">{entity.phone}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {/* Add New Card */}
              <Card
                className="border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setDialogOpen(true)}
              >
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[120px] text-muted-foreground">
                  <Plus className="h-8 w-8 mb-2" />
                  <span className="text-sm">Add {singularTitle}</span>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditingEntity(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEntity ? `Edit ${singularTitle}` : `New ${singularTitle}`}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter name"
                defaultValue={editingEntity?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="email@example.com"
                defaultValue={editingEntity?.email || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="+1 (555) 123-4567"
                defaultValue={editingEntity?.phone || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional notes..."
                defaultValue={editingEntity?.notes || ""}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingEntity ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {singularTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{entityToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
