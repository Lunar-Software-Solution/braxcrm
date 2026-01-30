import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Clock } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useEmailSequence, 
  useCreateEmailSequence, 
  useUpdateEmailSequence,
  useCreateSequenceStep,
  useUpdateSequenceStep,
  useDeleteSequenceStep
} from "@/hooks/use-email-sequences";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { 
  AUTOMATION_ENTITY_TABLES, 
  getEntityDisplayName,
  formatDelay,
  type SequenceStep 
} from "@/types/email-automation";

export default function SequenceBuilder() {
  const { sequenceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !sequenceId || sequenceId === "new";

  const { data: sequence, isLoading } = useEmailSequence(isNew ? undefined : sequenceId);
  const { data: templates } = useEmailTemplates();
  
  const createSequence = useCreateEmailSequence();
  const updateSequence = useUpdateEmailSequence();
  const createStep = useCreateSequenceStep();
  const updateStep = useUpdateSequenceStep();
  const deleteStep = useDeleteSequenceStep();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [entityTable, setEntityTable] = useState<string>("none");
  const [isActive, setIsActive] = useState(true);

  // Initialize form when sequence loads
  useState(() => {
    if (sequence) {
      setName(sequence.name);
      setDescription(sequence.description || "");
      setEntityTable(sequence.entity_table || "none");
      setIsActive(sequence.is_active);
    }
  });

  // New step form state
  const [newStep, setNewStep] = useState({
    templateId: "",
    delayDays: 0,
    delayHours: 0,
  });

  const handleSave = async () => {
    if (!user) return;

    if (isNew) {
      const result = await createSequence.mutateAsync({
        name,
        description: description || null,
        entity_table: entityTable === "none" ? null : entityTable,
        is_active: isActive,
        created_by: user.id,
      });
      navigate(`/email-automation/sequences/${result.id}`);
    } else {
      await updateSequence.mutateAsync({
        id: sequenceId!,
        updates: {
          name,
          description: description || null,
          entity_table: entityTable === "none" ? null : entityTable,
          is_active: isActive,
        },
      });
    }
  };

  const handleAddStep = async () => {
    if (!sequenceId || isNew || !newStep.templateId) return;

    const nextOrder = (sequence?.steps?.length || 0) + 1;
    
    await createStep.mutateAsync({
      sequence_id: sequenceId,
      step_order: nextOrder,
      template_id: newStep.templateId,
      delay_days: newStep.delayDays,
      delay_hours: newStep.delayHours,
    });

    setNewStep({ templateId: "", delayDays: 0, delayHours: 0 });
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!sequenceId) return;
    await deleteStep.mutateAsync({ id: stepId, sequenceId });
  };

  if (isLoading && !isNew) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/email-automation-hub")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {isNew ? "New Sequence" : "Edit Sequence"}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? "Create a multi-step email sequence" : sequence?.name}
          </p>
        </div>
        <Button onClick={handleSave} disabled={!name || createSequence.isPending || updateSequence.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Sequence Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sequence Settings</CardTitle>
          <CardDescription>Configure your email sequence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Welcome Series"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entity">Target Entity</Label>
              <Select value={entityTable} onValueChange={setEntityTable}>
                <SelectTrigger>
                  <SelectValue placeholder="All Contacts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Contacts</SelectItem>
                  {AUTOMATION_ENTITY_TABLES.map((table) => (
                    <SelectItem key={table} value={table}>
                      {getEntityDisplayName(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this sequence does..."
              rows={3}
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

      {/* Sequence Steps */}
      {!isNew && (
        <Card>
          <CardHeader>
            <CardTitle>Sequence Steps</CardTitle>
            <CardDescription>
              Add and configure the emails in this sequence
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Steps */}
            {sequence?.steps && sequence.steps.length > 0 ? (
              <div className="space-y-2">
                {sequence.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="font-medium">Step {index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{step.template?.name || "Unknown Template"}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDelay(step.delay_days, step.delay_hours)}
                      </div>
                    </div>
                    <Badge variant={step.is_active ? "default" : "secondary"}>
                      {step.is_active ? "Active" : "Disabled"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteStep(step.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No steps yet. Add your first email step below.
              </div>
            )}

            {/* Add New Step */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-4">Add New Step</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Email Template</Label>
                  <Select
                    value={newStep.templateId}
                    onValueChange={(v) => setNewStep({ ...newStep, templateId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Delay (days)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newStep.delayDays}
                    onChange={(e) => setNewStep({ ...newStep, delayDays: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delay (hours)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={newStep.delayHours}
                    onChange={(e) => setNewStep({ ...newStep, delayHours: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Button
                className="mt-4"
                onClick={handleAddStep}
                disabled={!newStep.templateId || createStep.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isNew && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Save the sequence first to add steps</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
