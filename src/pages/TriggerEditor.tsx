import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useEmailTrigger, 
  useCreateEmailTrigger, 
  useUpdateEmailTrigger 
} from "@/hooks/use-email-triggers";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { 
  AUTOMATION_ENTITY_TABLES, 
  getEntityDisplayName,
  type TriggerType 
} from "@/types/email-automation";

const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: "entity_created", label: "Entity Created" },
  { value: "entity_updated", label: "Entity Updated" },
  { value: "person_created", label: "Person Created" },
  { value: "person_linked", label: "Person Linked to Entity" },
  { value: "email_classified", label: "Email Classified" },
  { value: "manual", label: "Manual Trigger" },
];

export default function TriggerEditor() {
  const { triggerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !triggerId || triggerId === "new";

  const { data: trigger, isLoading } = useEmailTrigger(isNew ? undefined : triggerId);
  const { data: templates } = useEmailTemplates();
  
  const createTrigger = useCreateEmailTrigger();
  const updateTrigger = useUpdateEmailTrigger();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<TriggerType>("entity_created");
  const [entityTable, setEntityTable] = useState<string>("people");
  const [templateId, setTemplateId] = useState("");
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Initialize form when trigger loads
  useEffect(() => {
    if (trigger) {
      setName(trigger.name);
      setDescription(trigger.description || "");
      setTriggerType(trigger.trigger_type);
      setEntityTable(trigger.entity_table);
      setTemplateId(trigger.template_id);
      setDelayMinutes(trigger.delay_minutes);
      setIsActive(trigger.is_active);
    }
  }, [trigger]);

  const handleSave = async () => {
    if (!user || !templateId) return;

    if (isNew) {
      const result = await createTrigger.mutateAsync({
        name,
        description: description || null,
        trigger_type: triggerType,
        entity_table: entityTable,
        template_id: templateId,
        delay_minutes: delayMinutes,
        is_active: isActive,
        created_by: user.id,
      });
      navigate(`/email-automation/triggers/${result.id}`);
    } else {
      await updateTrigger.mutateAsync({
        id: triggerId!,
        updates: {
          name,
          description: description || null,
          trigger_type: triggerType,
          entity_table: entityTable,
          template_id: templateId,
          delay_minutes: delayMinutes,
          is_active: isActive,
        },
      });
    }
  };

  if (isLoading && !isNew) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/email-automation-hub")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {isNew ? "New Trigger" : "Edit Trigger"}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? "Create an event-based email trigger" : trigger?.name}
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={!name || !templateId || createTrigger.isPending || updateTrigger.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Trigger Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Trigger Settings</CardTitle>
          <CardDescription>Configure when this email should be sent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New Customer Welcome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="triggerType">Trigger Event</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity">Target Entity</Label>
              <Select value={entityTable} onValueChange={setEntityTable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_ENTITY_TABLES.map((table) => (
                    <SelectItem key={table} value={table}>
                      {getEntityDisplayName(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay">Delay (minutes)</Label>
              <Input
                id="delay"
                type="number"
                min="0"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                0 = send immediately
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when this trigger fires..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </CardContent>
      </Card>

      {/* Email Template */}
      <Card>
        <CardHeader>
          <CardTitle>Email Template</CardTitle>
          <CardDescription>Choose which email to send</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="template">Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No templates available.{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto"
                  onClick={() => navigate("/email-automation/templates/new")}
                >
                  Create one first
                </Button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
