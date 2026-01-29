import { useState, useEffect } from "react";
import { 
  Zap, Plus, Tag, ChevronDown, ChevronUp, Eye, FileText, AlertTriangle, 
  Users, Loader2, Sparkles, Store, Package, Receipt, Building2, Contact, CreditCard, Trash2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEntityAutomationRules,
  useUpdateEntityRule,
  useCreateEntityRuleAction,
  useUpdateEntityRuleAction,
  useDeleteEntityRuleAction,
  useInitializeEntityRules,
} from "@/hooks/use-entity-automation";
import { useEmailTags, useVisibilityGroups } from "@/hooks/use-email-rules";
import { 
  ENTITY_AUTOMATION_CONFIG, 
  ENTITY_ACTION_AVAILABILITY, 
  ENTITY_TABLES,
  type EntityAutomationRule,
} from "@/types/entity-automation";
import type { RuleActionType } from "@/types/email-rules";

// Icon mapping for dynamic rendering
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Sparkles,
  Store,
  Package,
  Receipt,
  Building2,
  Contact,
  CreditCard,
};

const ACTION_TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  visibility: { label: "Set Visibility", icon: <Eye className="h-4 w-4" />, description: "Restrict who can see this email" },
  tag: { label: "Apply Tags", icon: <Tag className="h-4 w-4" />, description: "Add tags to the email" },
  extract_invoice: { label: "Extract Invoice", icon: <FileText className="h-4 w-4" />, description: "Parse invoice data with AI" },
  mark_priority: { label: "Set Priority", icon: <AlertTriangle className="h-4 w-4" />, description: "Mark email priority level" },
  assign_role: { label: "Assign Role", icon: <Users className="h-4 w-4" />, description: "Assign a role to the sender" },
};

export default function EmailAutomation() {
  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [showAddAction, setShowAddAction] = useState<string | null>(null);
  const [newActionType, setNewActionType] = useState<RuleActionType>("tag");
  const [newActionConfig, setNewActionConfig] = useState<Record<string, unknown>>({});

  const { user } = useAuth();

  const { data: rules = [], isLoading } = useEntityAutomationRules();
  const { data: tags = [] } = useEmailTags();
  const { data: visibilityGroups = [] } = useVisibilityGroups();

  const updateRule = useUpdateEntityRule();
  const createAction = useCreateEntityRuleAction();
  const updateAction = useUpdateEntityRuleAction();
  const deleteAction = useDeleteEntityRuleAction();
  const initializeRules = useInitializeEntityRules();

  // Auto-initialize rules if none exist
  useEffect(() => {
    if (!isLoading && rules.length === 0 && user) {
      initializeRules.mutate();
    }
  }, [isLoading, rules.length, user]);

  // Create a map for quick lookup
  const rulesMap = new Map<string, EntityAutomationRule>();
  for (const rule of rules) {
    rulesMap.set(rule.entity_table, rule);
  }

  const toggleEntityExpanded = (entityTable: string) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(entityTable)) {
        next.delete(entityTable);
      } else {
        next.add(entityTable);
      }
      return next;
    });
  };

  const getActiveActionsCount = (rule: EntityAutomationRule | undefined): number => {
    if (!rule?.actions) return 0;
    return rule.actions.filter((a) => a.is_active).length;
  };

  const getDefaultConfig = (actionType: RuleActionType): Record<string, unknown> => {
    switch (actionType) {
      case "tag": return { tag_ids: [] };
      case "visibility": return { visibility_group_id: "" };
      case "mark_priority": return { priority: "normal" };
      default: return {};
    }
  };

  const handleAddAction = async (ruleId: string) => {
    await createAction.mutateAsync({
      entity_rule_id: ruleId,
      action_type: newActionType,
      config: Object.keys(newActionConfig).length > 0 ? newActionConfig : getDefaultConfig(newActionType),
    });
    setNewActionType("tag");
    setNewActionConfig({});
    setShowAddAction(null);
  };

  const renderActionConfig = (
    actionType: string, 
    config: Record<string, unknown>, 
    onChange: (config: Record<string, unknown>) => void
  ) => {
    switch (actionType) {
      case "tag":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Select Tags</Label>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => {
                const selectedIds = (config.tag_ids as string[]) || [];
                const isSelected = selectedIds.includes(tag.id);
                return (
                  <Badge
                    key={tag.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    style={{ backgroundColor: isSelected ? tag.color || undefined : undefined }}
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
              {tags.length === 0 && <p className="text-xs text-muted-foreground">No tags created</p>}
            </div>
          </div>
        );
      
      case "visibility":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Visibility Group</Label>
            <Select 
              value={(config.visibility_group_id as string) || ""} 
              onValueChange={(value) => onChange({ ...config, visibility_group_id: value })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {visibilityGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "mark_priority":
        return (
          <div className="space-y-2">
            <Label className="text-xs">Priority Level</Label>
            <Select 
              value={(config.priority as string) || "normal"} 
              onValueChange={(value) => onChange({ ...config, priority: value })}
            >
              <SelectTrigger className="h-8 text-xs">
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
        return <p className="text-xs text-muted-foreground">No additional configuration needed</p>;
    }
  };

  const renderEntityIcon = (iconName: string, color: string) => {
    const IconComponent = ICON_MAP[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="h-5 w-5" style={{ color }} />;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Zap className="h-5 w-5 text-amber-500" />
          <div>
            <h1 className="text-lg font-semibold">Email Automation</h1>
            <p className="text-sm text-muted-foreground">Configure automation rules per entity type</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12"></TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead className="w-24 text-center">Status</TableHead>
              <TableHead className="w-32 text-center">Active Actions</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ENTITY_TABLES.map((entityTable) => {
              const config = ENTITY_AUTOMATION_CONFIG[entityTable];
              const rule = rulesMap.get(entityTable);
              const isExpanded = expandedEntities.has(entityTable);
              const availableActions = ENTITY_ACTION_AVAILABILITY[entityTable] || [];
              const activeCount = getActiveActionsCount(rule);

              return (
                <Collapsible key={entityTable} open={isExpanded} onOpenChange={() => toggleEntityExpanded(entityTable)}>
                  <CollapsibleTrigger asChild>
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="w-12">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {renderEntityIcon(config.icon, config.color)}
                          <span className="font-medium">{config.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={rule?.is_active ?? true}
                          onCheckedChange={(checked) => {
                            if (rule) {
                              updateRule.mutate({ id: rule.id, data: { is_active: checked } });
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{activeCount} / {availableActions.length}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {rule?.description || config.label}
                      </TableCell>
                    </TableRow>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent asChild>
                    <tr>
                      <td colSpan={5} className="p-0 border-b">
                        <div className="bg-muted/20 px-6 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h4 className="text-sm font-medium">Available Actions</h4>
                            {rule && showAddAction !== rule.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setShowAddAction(rule.id);
                                  setNewActionType(availableActions[0] || "tag");
                                  setNewActionConfig({});
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add Action
                              </Button>
                            )}
                          </div>

                          {/* Add Action Form */}
                          {rule && showAddAction === rule.id && (
                            <div className="mb-4 p-3 border rounded-lg bg-background">
                              <div className="flex items-center gap-3 mb-3">
                                <Select 
                                  value={newActionType} 
                                  onValueChange={(v) => {
                                    setNewActionType(v as RuleActionType);
                                    setNewActionConfig(getDefaultConfig(v as RuleActionType));
                                  }}
                                >
                                  <SelectTrigger className="w-48 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableActions.map((action) => (
                                      <SelectItem key={action} value={action}>
                                        {ACTION_TYPE_LABELS[action]?.label || action}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button 
                                  size="sm" 
                                  className="h-7 text-xs"
                                  onClick={() => handleAddAction(rule.id)}
                                  disabled={createAction.isPending}
                                >
                                  {createAction.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-7 text-xs"
                                  onClick={() => setShowAddAction(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                              {renderActionConfig(newActionType, newActionConfig, setNewActionConfig)}
                            </div>
                          )}

                          {/* Existing Actions */}
                          <div className="space-y-2">
                            {availableActions.map((actionType) => {
                              const existingAction = rule?.actions?.find((a) => a.action_type === actionType);
                              const actionInfo = ACTION_TYPE_LABELS[actionType];

                              return (
                                <div 
                                  key={actionType} 
                                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                                    existingAction?.is_active ? "bg-background" : "bg-muted/30 opacity-60"
                                  }`}
                                >
                                  <div className="pt-0.5">
                                    {actionInfo?.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{actionInfo?.label}</span>
                                      {existingAction && (
                                        <Badge 
                                          variant={existingAction.is_active ? "default" : "secondary"} 
                                          className="text-xs"
                                        >
                                          {existingAction.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{actionInfo?.description}</p>
                                    
                                    {existingAction && (
                                      <div className="mt-2">
                                        {renderActionConfig(
                                          actionType, 
                                          existingAction.config, 
                                          (newConfig) => updateAction.mutate({ id: existingAction.id, data: { config: newConfig } })
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {existingAction ? (
                                      <>
                                        <Switch
                                          checked={existingAction.is_active}
                                          onCheckedChange={(checked) => 
                                            updateAction.mutate({ id: existingAction.id, data: { is_active: checked } })
                                          }
                                        />
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                          onClick={() => deleteAction.mutate(existingAction.id)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs"
                                        onClick={() => {
                                          if (rule) {
                                            createAction.mutate({
                                              entity_rule_id: rule.id,
                                              action_type: actionType,
                                              config: getDefaultConfig(actionType),
                                            });
                                          }
                                        }}
                                      >
                                        Enable
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
