import { useState } from "react";
import { Plus, Edit, Trash2, Tag, ChevronDown, ChevronUp, Eye, FileText, FolderInput, AlertTriangle, Layers, Users, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
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
import {
  useEmailTags,
  useVisibilityGroups,
  useCreateRuleAction,
  useUpdateRuleAction,
  useDeleteRuleAction,
} from "@/hooks/use-email-rules";
import type { RuleActionType, AssignObjectTypeConfig, AssignEntityConfig, EntityType } from "@/types/email-rules";
import type { ObjectType } from "@/types/crm";

interface EmailCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

interface EmailRule {
  id: string;
  name: string;
  category_id: string;
  is_active: boolean;
  priority: number;
  actions?: EmailRuleAction[];
}

interface EmailRuleAction {
  id: string;
  rule_id: string;
  action_type: RuleActionType;
  config: Record<string, unknown>;
  is_active: boolean;
}

interface CategoryWithRule extends EmailCategory {
  rule?: EmailRule;
}

const defaultColors = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

const ACTION_TYPE_LABELS: Record<RuleActionType, { label: string; icon: React.ReactNode; description: string }> = {
  visibility: { label: "Set Visibility", icon: <Eye className="h-4 w-4" />, description: "Restrict who can see this email" },
  tag: { label: "Apply Tags", icon: <Tag className="h-4 w-4" />, description: "Add tags to the email" },
  extract_attachments: { label: "Extract Attachments", icon: <FileText className="h-4 w-4" />, description: "Save attachments to storage" },
  extract_invoice: { label: "Extract Invoice", icon: <FileText className="h-4 w-4" />, description: "Parse invoice data with AI" },
  move_folder: { label: "Move to Folder", icon: <FolderInput className="h-4 w-4" />, description: "Move email to a specific folder" },
  mark_priority: { label: "Set Priority", icon: <AlertTriangle className="h-4 w-4" />, description: "Mark email priority level" },
  assign_object_type: { label: "Assign Object Type", icon: <Layers className="h-4 w-4" />, description: "Assign object types to person/email" },
  assign_entity: { label: "Assign to Entity", icon: <Users className="h-4 w-4" />, description: "Create/link to Influencer, Reseller, or Supplier" },
  assign_role: { label: "Assign Role", icon: <Users className="h-4 w-4" />, description: "Assign a role to the sender" },
};

function useObjectTypes() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["object-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("object_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as ObjectType[];
    },
    enabled: !!user,
  });
}

export default function EmailAutomation() {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EmailCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<EmailCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddAction, setShowAddAction] = useState<string | null>(null);
  const [newActionType, setNewActionType] = useState<RuleActionType>("tag");
  const [newActionConfig, setNewActionConfig] = useState<Record<string, unknown>>({});

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [] } = useEmailTags();
  const { data: visibilityGroups = [] } = useVisibilityGroups();
  const { data: objectTypes = [] } = useObjectTypes();

  const createAction = useCreateRuleAction();
  const updateAction = useUpdateRuleAction();
  const deleteAction = useDeleteRuleAction();

  // Fetch categories with their rules and actions
  const { data: categoriesWithRules = [], isLoading } = useQuery({
    queryKey: ["email-automation-categories"],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from("email_categories")
        .select("*")
        .order("sort_order");
      if (catError) throw catError;

      const { data: rules, error: rulesError } = await supabase
        .from("email_rules")
        .select(`*, actions:email_rule_actions(*)`)
        .order("priority", { ascending: false });
      if (rulesError) throw rulesError;

      const rulesMap = new Map<string, EmailRule>();
      for (const rule of rules || []) {
        rulesMap.set(rule.category_id, rule as EmailRule);
      }

      return (categories || []).map((cat) => ({
        ...cat,
        rule: rulesMap.get(cat.id),
      })) as CategoryWithRule[];
    },
    enabled: !!user,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description: string | null; color: string; is_active: boolean; sort_order: number; created_by: string }) => {
      const { data: category, error: catError } = await supabase
        .from("email_categories")
        .insert([data])
        .select()
        .single();
      if (catError) throw catError;

      const { error: ruleError } = await supabase
        .from("email_rules")
        .insert([{
          name: `${data.name} Actions`,
          category_id: category.id,
          created_by: data.created_by,
          is_active: true,
          priority: 0,
        }]);
      if (ruleError) throw ruleError;

      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automation-categories"] });
      toast({ title: "Category created" });
      setCategoryDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "Failed to create category", description: error.message, variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmailCategory> }) => {
      const { error } = await supabase.from("email_categories").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automation-categories"] });
      toast({ title: "Category updated" });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
    },
    onError: (error) => {
      toast({ title: "Failed to update category", description: error.message, variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automation-categories"] });
      toast({ title: "Category deleted" });
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast({ title: "Failed to delete category", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("email_categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-automation-categories"] });
    },
  });

  const handleSaveCategory = (formData: FormData) => {
    if (!user) return;

    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      color: formData.get("color") as string,
      is_active: true,
      sort_order: categoriesWithRules.length,
      created_by: user.id,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const toggleCategoryExpanded = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const getDefaultConfig = (actionType: RuleActionType): Record<string, unknown> => {
    switch (actionType) {
      case "tag": return { tag_ids: [] };
      case "visibility": return { visibility_group_id: "" };
      case "assign_object_type": return { object_type_ids: [], assign_to_person: true, assign_to_email: false };
      case "assign_entity": return { entity_type: "influencer", create_if_not_exists: true };
      case "mark_priority": return { priority: "normal" };
      default: return {};
    }
  };

  const handleAddAction = async (ruleId: string) => {
    await createAction.mutateAsync({
      rule_id: ruleId,
      action_type: newActionType,
      config: newActionConfig,
    });
    setNewActionType("tag");
    setNewActionConfig({});
    setShowAddAction(null);
    queryClient.invalidateQueries({ queryKey: ["email-automation-categories"] });
  };

  const renderActionConfig = (actionType: RuleActionType, config: Record<string, unknown>, onChange: (config: Record<string, unknown>) => void) => {
    switch (actionType) {
      case "tag":
        return (
          <div className="space-y-2">
            <Label>Select Tags</Label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selectedIds = (config.tag_ids as string[]) || [];
                const isSelected = selectedIds.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    style={{ backgroundColor: isSelected ? tag.color : undefined }}
                    onClick={() => {
                      const newIds = isSelected ? selectedIds.filter(id => id !== tag.id) : [...selectedIds, tag.id];
                      onChange({ ...config, tag_ids: newIds });
                    }}
                  >
                    {tag.name}
                  </Badge>
                );
              })}
              {tags.length === 0 && <p className="text-sm text-muted-foreground">No tags created yet</p>}
            </div>
          </div>
        );
      
      case "visibility":
        return (
          <div className="space-y-2">
            <Label>Visibility Group</Label>
            <Select value={(config.visibility_group_id as string) || ""} onValueChange={(value) => onChange({ ...config, visibility_group_id: value })}>
              <SelectTrigger><SelectValue placeholder="Select a visibility group" /></SelectTrigger>
              <SelectContent>
                {visibilityGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case "assign_object_type": {
        const objectTypeConfig = config as unknown as AssignObjectTypeConfig;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Object Types</Label>
              <div className="flex flex-wrap gap-2">
                {objectTypes.map((type) => {
                  const selectedIds = objectTypeConfig.object_type_ids || [];
                  const isSelected = selectedIds.includes(type.id);
                  return (
                    <Badge
                      key={type.id}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer"
                      style={{ backgroundColor: isSelected ? type.color : undefined }}
                      onClick={() => {
                        const newIds = isSelected ? selectedIds.filter(id => id !== type.id) : [...selectedIds, type.id];
                        onChange({ ...config, object_type_ids: newIds });
                      }}
                    >
                      {type.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Assignment Options</Label>
              <div className="flex items-center space-x-2">
                <Checkbox id="assign-to-person" checked={objectTypeConfig.assign_to_person ?? true} onCheckedChange={(checked) => onChange({ ...config, assign_to_person: checked })} />
                <Label htmlFor="assign-to-person" className="font-normal">Assign to Person</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="assign-to-email" checked={objectTypeConfig.assign_to_email ?? false} onCheckedChange={(checked) => onChange({ ...config, assign_to_email: checked })} />
                <Label htmlFor="assign-to-email" className="font-normal">Assign to Email</Label>
              </div>
            </div>
          </div>
        );
      }
      
      case "assign_entity": {
        const entityConfig = config as unknown as AssignEntityConfig;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select value={entityConfig.entity_type || "influencer"} onValueChange={(value: EntityType) => onChange({ ...config, entity_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="influencer">Influencer</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                  <SelectItem value="product_supplier">Product Supplier</SelectItem>
                  <SelectItem value="expense_supplier">Expense Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="create-if-not-exists" checked={entityConfig.create_if_not_exists ?? true} onCheckedChange={(checked) => onChange({ ...config, create_if_not_exists: checked })} />
              <Label htmlFor="create-if-not-exists" className="font-normal">Create entity if not exists</Label>
            </div>
          </div>
        );
      }

      case "mark_priority":
        return (
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <Select value={(config.priority as string) || "normal"} onValueChange={(value) => onChange({ ...config, priority: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      
      default:
        return <p className="text-sm text-muted-foreground">No additional configuration needed</p>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-500" />
          <div>
            <h1 className="text-lg font-semibold">Email Automation</h1>
            <p className="text-sm text-muted-foreground">Define categories for AI classification and configure automation actions</p>
          </div>
        </div>
        <Button onClick={() => setCategoryDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : categoriesWithRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No categories yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Create categories like "Invoices", "Support Requests", or "Sales Leads" and add automation actions.
            </p>
            <Button onClick={() => setCategoryDialogOpen(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Category
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesWithRules.map((category) => (
                <Collapsible
                  key={category.id}
                  open={expandedCategories.has(category.id)}
                  onOpenChange={() => toggleCategoryExpanded(category.id)}
                  asChild
                >
                  <>
                    <TableRow className="group cursor-pointer hover:bg-muted/30" onClick={() => toggleCategoryExpanded(category.id)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: category.color || "#6366f1" }} />
                          <span className="font-medium">{category.name}</span>
                          {expandedCategories.has(category.id) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground line-clamp-1">{category.description || "—"}</span>
                      </TableCell>
                      <TableCell>
                        {category.rule?.actions && category.rule.actions.length > 0 ? (
                          <Badge variant="outline">
                            {category.rule.actions.length} action{category.rule.actions.length !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={(checked) => {
                            toggleActiveMutation.mutate({ id: category.id, is_active: checked });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); setEditingCategory(category); setCategoryDialogOpen(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setCategoryToDelete(category); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={5} className="p-0">
                          <div className="p-4 space-y-3">
                            <div className="text-sm font-medium text-muted-foreground mb-2">Automation Actions</div>
                            {category.rule?.actions?.map((action) => (
                              <div key={action.id} className="flex items-start justify-between p-3 rounded-md bg-background border border-border">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5">{ACTION_TYPE_LABELS[action.action_type]?.icon}</div>
                                  <div>
                                    <p className="font-medium text-sm">{ACTION_TYPE_LABELS[action.action_type]?.label}</p>
                                    <p className="text-xs text-muted-foreground">{ACTION_TYPE_LABELS[action.action_type]?.description}</p>
                                    {action.action_type === "assign_object_type" && action.config && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {((action.config as Record<string, unknown>).object_type_ids as string[] || []).map(typeId => {
                                          const objType = objectTypes.find(t => t.id === typeId);
                                          return objType ? (
                                            <Badge key={typeId} variant="secondary" style={{ backgroundColor: objType.color }} className="text-white text-xs">{objType.name}</Badge>
                                          ) : null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch checked={action.is_active} onCheckedChange={(checked) => { updateAction.mutate({ id: action.id, is_active: checked }); queryClient.invalidateQueries({ queryKey: ["email-automation-categories"] }); }} />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => { deleteAction.mutate(action.id); queryClient.invalidateQueries({ queryKey: ["email-automation-categories"] }); }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {(!category.rule?.actions || category.rule.actions.length === 0) && (
                              <p className="text-sm text-muted-foreground text-center py-2">No actions configured yet</p>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2"
                              onClick={() => {
                                if (category.rule) {
                                  setNewActionType("tag");
                                  setNewActionConfig(getDefaultConfig("tag"));
                                  setShowAddAction(category.rule.id);
                                }
                              }}
                              disabled={!category.rule}
                            >
                              <Plus className="h-4 w-4" />
                              Add Action
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add/Edit Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={(open) => { setCategoryDialogOpen(open); if (!open) setEditingCategory(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
            <DialogDescription>Categories are used by AI to classify incoming emails. Actions will be executed automatically when emails match.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" placeholder="e.g., Invoices, Support, Sales Leads" defaultValue={editingCategory?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Describe what emails belong in this category. This helps the AI classify more accurately." defaultValue={editingCategory?.description || ""} rows={3} />
              <p className="text-xs text-muted-foreground">Be specific! E.g., "Emails containing invoices, bills, payment requests, or receipts from vendors."</p>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {defaultColors.map((color) => (
                  <label key={color} className="cursor-pointer">
                    <input type="radio" name="color" value={color} defaultChecked={color === (editingCategory?.color || defaultColors[0])} className="sr-only" />
                    <div className="h-8 w-8 rounded-full border-2 border-transparent hover:scale-110 transition-transform [input:checked+&]:border-foreground [input:checked+&]:ring-2 [input:checked+&]:ring-offset-2" style={{ backgroundColor: color }} />
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
                {editingCategory ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{categoryToDelete?.name}"? This will also delete all associated automation actions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => categoryToDelete && deleteCategoryMutation.mutate(categoryToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Action Dialog */}
      <Dialog open={!!showAddAction} onOpenChange={() => setShowAddAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Action</DialogTitle>
            <DialogDescription>Choose an action to perform when emails match this category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={newActionType} onValueChange={(value: RuleActionType) => { setNewActionType(value); setNewActionConfig(getDefaultConfig(value)); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_TYPE_LABELS).map(([type, { label, icon }]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">{icon}{label}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2">
              {renderActionConfig(newActionType, newActionConfig, setNewActionConfig)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAction(null)}>Cancel</Button>
            <Button onClick={() => showAddAction && handleAddAction(showAddAction)} disabled={createAction.isPending}>
              {createAction.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
