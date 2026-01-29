import { useState } from "react";
import { Plus, Edit, Trash2, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { TableHeader as CRMTableHeader } from "@/components/crm/TableHeader";
import { TableFooter } from "@/components/crm/TableFooter";
import { AddNewRow } from "@/components/crm/AddNewRow";
import { EntityDetailPanel } from "@/components/crm/EntityDetailPanel";
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

const getColumns = () => [
  { key: "select", label: "", icon: null, width: "w-10" },
  { key: "name", label: "Name", icon: User, width: "min-w-[200px]" },
  { key: "email", label: "Emails", icon: Mail, width: "min-w-[220px]" },
  { key: "phone", label: "Phones", icon: Phone, width: "min-w-[150px]" },
  { key: "add", label: "+", icon: null, width: "w-10" },
];

export default function EntityList({ entityType, title, singularTitle, color }: EntityListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const { list, isLoading, create, update, delete: deleteEntity } = useEntities(entityType);

  const columns = getColumns();

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
      if (selectedEntity?.id === entityToDelete.id) {
        setSelectedEntity(null);
      }
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

  const getInitials = (name: string) => 
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(list.map(e => e.id)));
  };

  const aggregations = [
    { label: "Count all", value: list.length },
    { label: "With email", value: list.filter(e => e.email).length },
    { label: "With phone", value: list.filter(e => e.phone).length },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      <CRMTableHeader title={title} count={list.length} />

      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={selectedEntity ? 65 : 100} minSize={50}>
            <div className="h-full flex flex-col overflow-hidden">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading {title.toLowerCase()}...</p>
                </div>
              ) : !user ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">Please log in to view {title.toLowerCase()}</p>
                </div>
              ) : list.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
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
                <ScrollArea className="flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        {columns.map((col) => (
                          <TableHead key={col.key} className={`${col.width} bg-muted/50`}>
                            {col.key === "select" ? (
                              <Checkbox 
                                checked={selectedIds.size === list.length && list.length > 0} 
                                onCheckedChange={toggleSelectAll} 
                              />
                            ) : col.key === "add" ? (
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <Plus className="h-4 w-4" />
                              </Button>
                            ) : (
                              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                {col.icon && <col.icon className="h-3.5 w-3.5" />}
                                {col.label}
                              </div>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((entity) => (
                        <TableRow 
                          key={entity.id} 
                          className={`cursor-pointer group ${selectedEntity?.id === entity.id ? "bg-muted" : ""}`}
                          onClick={() => setSelectedEntity(entity)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox 
                              checked={selectedIds.has(entity.id)} 
                              onCheckedChange={() => toggleSelect(entity.id)} 
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={entity.avatar_url || undefined} />
                                <AvatarFallback 
                                  className="text-xs text-white" 
                                  style={{ backgroundColor: color }}
                                >
                                  {getInitials(entity.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate">{entity.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground truncate">
                            {entity.email || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {entity.phone || "—"}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      ))}
                      <AddNewRow colSpan={columns.length} onClick={() => setDialogOpen(true)} label="Add New" />
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
              {list.length > 0 && <TableFooter aggregations={aggregations} />}
            </div>
          </ResizablePanel>

          {selectedEntity && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
                <EntityDetailPanel
                  entity={selectedEntity}
                  entityType={entityType}
                  entityColor={color}
                  onClose={() => setSelectedEntity(null)}
                  onEdit={() => openEdit(selectedEntity)}
                  onDelete={() => openDelete(selectedEntity)}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
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