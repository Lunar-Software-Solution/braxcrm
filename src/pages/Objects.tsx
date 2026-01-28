import { useState, useEffect } from "react";
import { Tag, Plus, Edit, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableHeader as CRMTableHeader } from "@/components/crm/TableHeader";
import { useCRM } from "@/hooks/use-crm";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ObjectType } from "@/types/crm";
import { supabase } from "@/integrations/supabase/client";
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

const defaultColors = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
];

export default function Objects() {
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [peopleCounts, setPeopleCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ObjectType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<ObjectType | null>(null);

  const { listObjectTypes, createObjectType, updateObjectType, deleteObjectType } = useCRM();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const typesData = await listObjectTypes(workspaceId);
      setObjectTypes(typesData);

      // Get people counts for each object type
      const { data: counts } = await supabase
        .from("person_object_types")
        .select("object_type_id");

      const countMap: Record<string, number> = {};
      (counts || []).forEach((c) => {
        countMap[c.object_type_id] = (countMap[c.object_type_id] || 0) + 1;
      });
      setPeopleCounts(countMap);
    } catch (error) {
      console.error("Failed to load object types:", error);
      toast({
        title: "Failed to load object types",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: FormData) => {
    if (!workspaceId || !user) return;
    try {
      const data = {
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        color: formData.get("color") as string,
        icon: "tag",
        is_active: true,
        sort_order: objectTypes.length,
      };

      if (editingType) {
        await updateObjectType(editingType.id, data);
        toast({ title: "Object type updated" });
      } else {
        await createObjectType({
          ...data,
          workspace_id: workspaceId,
          created_by: user.id,
        });
        toast({ title: "Object type created" });
      }

      setDialogOpen(false);
      setEditingType(null);
      loadData();
    } catch (error) {
      toast({
        title: "Failed to save object type",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!typeToDelete) return;
    try {
      await deleteObjectType(typeToDelete.id);
      toast({ title: "Object type deleted" });
      setDeleteDialogOpen(false);
      setTypeToDelete(null);
      loadData();
    } catch (error) {
      toast({
        title: "Failed to delete object type",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const openEdit = (type: ObjectType) => {
    setEditingType(type);
    setDialogOpen(true);
  };

  const openDelete = (type: ObjectType) => {
    setTypeToDelete(type);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <CRMTableHeader title="Object Types" count={objectTypes.length} />

      <div className="flex-1 overflow-hidden p-6">
        {loading || workspaceLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading object types...</p>
          </div>
        ) : !workspaceId ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Please log in to view object types</p>
          </div>
        ) : objectTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No object types yet</h3>
            <p className="text-muted-foreground mb-4">
              Create object types like Influencers, Suppliers, or Resellers to categorize your contacts
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Object Type
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {objectTypes.map((type) => (
                <Card key={type.id} className="group">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: type.color }}
                        />
                        <CardTitle className="text-base">{type.name}</CardTitle>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(type)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => openDelete(type)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {type.description && (
                      <CardDescription className="line-clamp-2">
                        {type.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{peopleCounts[type.id] || 0} people</span>
                    </div>
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
                  <span className="text-sm">Add Object Type</span>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) setEditingType(null);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Object Type" : "New Object Type"}</DialogTitle>
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
                placeholder="e.g., Influencer, Supplier, Reseller"
                defaultValue={editingType?.name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of this object type..."
                defaultValue={editingType?.description || ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {defaultColors.map((color) => (
                  <label key={color} className="cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      value={color}
                      defaultChecked={color === (editingType?.color || defaultColors[0])}
                      className="sr-only"
                    />
                    <div
                      className="h-8 w-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform [input:checked+&]:border-foreground [input:checked+&]:ring-2 [input:checked+&]:ring-offset-2"
                      style={{ backgroundColor: color }}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingType ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Object Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{typeToDelete?.name}"? This will remove it from all
              associated people and emails. This action cannot be undone.
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
