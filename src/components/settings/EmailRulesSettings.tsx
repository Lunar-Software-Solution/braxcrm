import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Settings2,
  Plus,
  Trash2,
  Loader2,
  Tag,
  Eye,
  FileText,
  FolderInput,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import {
  useEmailCategories,
  useEmailRules,
  useCreateRule,
  useUpdateRule,
  useDeleteRule,
  useCreateRuleAction,
  useUpdateRuleAction,
  useDeleteRuleAction,
  useEmailTags,
  useVisibilityGroups,
} from "@/hooks/use-email-rules";
// useObjectTypes is now defined above
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ObjectType } from "@/types/crm";
import type { RuleActionType, AssignObjectTypeConfig, AssignEntityConfig, EntityType } from "@/types/email-rules";

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

export default function EmailRulesSettings() {
  const { data: categories = [], isLoading: loadingCategories } = useEmailCategories();
  const { data: rules = [], isLoading: loadingRules } = useEmailRules();
  const { data: tags = [] } = useEmailTags();
  const { data: visibilityGroups = [] } = useVisibilityGroups();
  const { data: objectTypes = [] } = useObjectTypes();
  
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const deleteRule = useDeleteRule();
  const createAction = useCreateRuleAction();
  const updateAction = useUpdateRuleAction();
  const deleteAction = useDeleteRuleAction();
  
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [showAddRule, setShowAddRule] = useState(false);
  const [showAddAction, setShowAddAction] = useState<string | null>(null);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleCategoryId, setNewRuleCategoryId] = useState("");
  const [newActionType, setNewActionType] = useState<RuleActionType>("tag");
  const [newActionConfig, setNewActionConfig] = useState<Record<string, unknown>>({});

  const toggleRuleExpanded = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const handleCreateRule = async () => {
    if (!newRuleName.trim() || !newRuleCategoryId) return;
    
    await createRule.mutateAsync({
      name: newRuleName.trim(),
      category_id: newRuleCategoryId,
    });
    
    setNewRuleName("");
    setNewRuleCategoryId("");
    setShowAddRule(false);
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
  };

  const getDefaultConfig = (actionType: RuleActionType): Record<string, unknown> => {
    switch (actionType) {
      case "tag":
        return { tag_ids: [] };
      case "visibility":
        return { visibility_group_id: "" };
      case "assign_object_type":
        return { object_type_ids: [], assign_to_person: true, assign_to_email: false };
      case "assign_entity":
        return { entity_type: "influencer", create_if_not_exists: true };
      case "mark_priority":
        return { priority: "normal" };
      default:
        return {};
    }
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
                      const newIds = isSelected
                        ? selectedIds.filter(id => id !== tag.id)
                        : [...selectedIds, tag.id];
                      onChange({ ...config, tag_ids: newIds });
                    }}
                  >
                    {tag.name}
                  </Badge>
                );
              })}
              {tags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags created yet</p>
              )}
            </div>
          </div>
        );
      
      case "visibility":
        return (
          <div className="space-y-2">
            <Label>Visibility Group</Label>
            <Select
              value={(config.visibility_group_id as string) || ""}
              onValueChange={(value) => onChange({ ...config, visibility_group_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a visibility group" />
              </SelectTrigger>
              <SelectContent>
                {visibilityGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {visibilityGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">No visibility groups created yet</p>
            )}
          </div>
        );
      
      case "assign_object_type":
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
                        const newIds = isSelected
                          ? selectedIds.filter(id => id !== type.id)
                          : [...selectedIds, type.id];
                        onChange({ ...config, object_type_ids: newIds });
                      }}
                    >
                      {type.name}
                    </Badge>
                  );
                })}
                {objectTypes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No object types created yet. Create them in the Objects page.</p>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Assignment Options</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assign-to-person"
                  checked={objectTypeConfig.assign_to_person ?? true}
                  onCheckedChange={(checked) => onChange({ ...config, assign_to_person: checked })}
                />
                <Label htmlFor="assign-to-person" className="font-normal">
                  Assign to Person (sender/recipient)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="assign-to-email"
                  checked={objectTypeConfig.assign_to_email ?? false}
                  onCheckedChange={(checked) => onChange({ ...config, assign_to_email: checked })}
                />
                <Label htmlFor="assign-to-email" className="font-normal">
                  Assign to Email message
                </Label>
              </div>
            </div>
          </div>
        );
      
      case "assign_entity": {
        const entityConfig = config as unknown as AssignEntityConfig;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select
                value={entityConfig.entity_type || "influencer"}
                onValueChange={(value: EntityType) => onChange({ ...config, entity_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="influencer">Influencer</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="create-if-not-exists"
                checked={entityConfig.create_if_not_exists ?? true}
                onCheckedChange={(checked) => onChange({ ...config, create_if_not_exists: checked })}
              />
              <Label htmlFor="create-if-not-exists" className="font-normal">
                Create entity if not exists
              </Label>
            </div>
          </div>
        );
      }

      case "mark_priority":
        return (
          <div className="space-y-2">
            <Label>Priority Level</Label>
            <Select
              value={(config.priority as string) || "normal"}
              onValueChange={(value) => onChange({ ...config, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      
      default:
        return (
          <p className="text-sm text-muted-foreground">
            No additional configuration needed
          </p>
        );
    }
  };

  const loading = loadingCategories || loadingRules;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Email Rules</CardTitle>
              <CardDescription>Configure automatic actions for categorized emails</CardDescription>
            </div>
          </div>
          <Button onClick={() => setShowAddRule(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Settings2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">No email rules configured yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Rules define actions to perform when emails match a category
            </p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                First, create email categories to associate rules with
              </p>
            ) : (
              <Button onClick={() => setShowAddRule(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Rule
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-lg border border-border bg-muted/30"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleRuleExpanded(rule.id)}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => {
                        updateRule.mutate({ id: rule.id, is_active: checked });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{rule.name}</p>
                        <Badge
                          variant="secondary"
                          style={{ backgroundColor: rule.category?.color }}
                          className="text-white text-xs"
                        >
                          {rule.category?.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.actions?.length || 0} action{(rule.actions?.length || 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete rule?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete the rule "{rule.name}" and all its actions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteRule.mutate(rule.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {expandedRules.has(rule.id) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                {expandedRules.has(rule.id) && (
                  <div className="border-t border-border p-4 space-y-3">
                    {rule.actions?.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-start justify-between p-3 rounded-md bg-background border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {ACTION_TYPE_LABELS[action.action_type]?.icon}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {ACTION_TYPE_LABELS[action.action_type]?.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {ACTION_TYPE_LABELS[action.action_type]?.description}
                            </p>
                            {action.action_type === "assign_object_type" && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {((action.config as AssignObjectTypeConfig).object_type_ids || []).map(typeId => {
                                  const objType = objectTypes.find(t => t.id === typeId);
                                  return objType ? (
                                    <Badge 
                                      key={typeId} 
                                      variant="secondary" 
                                      style={{ backgroundColor: objType.color }}
                                      className="text-white text-xs"
                                    >
                                      {objType.name}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={action.is_active}
                            onCheckedChange={(checked) => {
                              updateAction.mutate({ id: action.id, is_active: checked });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteAction.mutate(action.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        setNewActionType("tag");
                        setNewActionConfig(getDefaultConfig("tag"));
                        setShowAddAction(rule.id);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Action
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Rule Dialog */}
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Email Rule</DialogTitle>
            <DialogDescription>
              Rules execute actions when emails match the selected category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                placeholder="e.g., Process Invoices"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newRuleCategoryId} onValueChange={setNewRuleCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Create email categories first to associate rules
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRule(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRule}
              disabled={!newRuleName.trim() || !newRuleCategoryId || createRule.isPending}
            >
              {createRule.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Action Dialog */}
      <Dialog open={!!showAddAction} onOpenChange={() => setShowAddAction(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Action</DialogTitle>
            <DialogDescription>
              Choose an action to perform when this rule matches
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select
                value={newActionType}
                onValueChange={(value: RuleActionType) => {
                  setNewActionType(value);
                  setNewActionConfig(getDefaultConfig(value));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_TYPE_LABELS).map(([type, { label, icon }]) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        {icon}
                        {label}
                      </div>
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
            <Button variant="outline" onClick={() => setShowAddAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => showAddAction && handleAddAction(showAddAction)}
              disabled={createAction.isPending}
            >
              {createAction.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
