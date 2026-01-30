import { useState, useEffect } from "react";
import { 
  Zap, Plus, Tag, ChevronDown, ChevronRight, Eye, FileText, AlertTriangle, 
  Users, Loader2, Sparkles, Store, Package, Receipt, Building2, Contact, CreditCard, Trash2,
  Brain, Save, Megaphone, Landmark, Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Megaphone,
  Landmark,
  Truck,
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
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
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
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <Zap className="h-5 w-5 text-amber-500" />
        <div>
          <h1 className="text-lg font-semibold">Email Automation</h1>
          <p className="text-sm text-muted-foreground">Configure automation rules per entity type</p>
        </div>
      </div>

      {/* Entity List */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y">
          {ENTITY_TABLES.map((entityTable) => {
            const config = ENTITY_AUTOMATION_CONFIG[entityTable];
            const rule = rulesMap.get(entityTable);
            const isExpanded = expandedEntities.has(entityTable);
            const availableActions = ENTITY_ACTION_AVAILABILITY[entityTable] || [];
            const activeCount = getActiveActionsCount(rule);

            return (
              <Collapsible key={entityTable} open={isExpanded} onOpenChange={() => toggleEntityExpanded(entityTable)}>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    {/* Chevron */}
                    <div className="w-5 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Icon + Name */}
                    <div className="flex items-center gap-3 min-w-[180px]">
                      {renderEntityIcon(config.icon, config.color)}
                      <span className="font-medium">{config.label}</span>
                    </div>

                    {/* Toggle */}
                    <Switch
                      checked={rule?.is_active ?? true}
                      onCheckedChange={(checked) => {
                        if (rule) {
                          updateRule.mutate({ id: rule.id, data: { is_active: checked } });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Active Count */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-[50px]">
                      <span className="font-medium text-foreground">{activeCount}</span>
                      <span>/</span>
                      <span>{availableActions.length}</span>
                    </div>

                    {/* AI Prompt Preview */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <Brain className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm text-muted-foreground truncate">
                        {rule?.ai_prompt || <span className="italic">No AI prompt configured</span>}
                      </p>
                    </div>

                    {/* Edit button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (rule) {
                          setEditingPrompt(rule.id);
                          setPromptDrafts({ ...promptDrafts, [rule.id]: rule.ai_prompt || "" });
                          if (!isExpanded) {
                            toggleEntityExpanded(entityTable);
                          }
                        }
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="bg-muted/30 px-6 py-4 ml-11 border-l-2 border-muted">
                    {/* AI Prompt Section */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-medium">AI Classification Prompt</h4>
                        </div>
                        {rule && editingPrompt !== rule.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditingPrompt(rule.id);
                              setPromptDrafts({ ...promptDrafts, [rule.id]: rule.ai_prompt || "" });
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      {rule && editingPrompt === rule.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={promptDrafts[rule.id] || ""}
                            onChange={(e) => setPromptDrafts({ ...promptDrafts, [rule.id]: e.target.value })}
                            placeholder="Describe what characteristics identify this entity type..."
                            className="min-h-[80px] text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                updateRule.mutate({ id: rule.id, data: { ai_prompt: promptDrafts[rule.id] } });
                                setEditingPrompt(null);
                              }}
                              disabled={updateRule.isPending}
                            >
                              {updateRule.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setEditingPrompt(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground bg-background/50 p-2 rounded border">
                          {rule?.ai_prompt || <span className="italic">No prompt configured. Click Edit to add one.</span>}
                        </p>
                      )}
                    </div>

                    {/* Actions Section */}
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
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}
