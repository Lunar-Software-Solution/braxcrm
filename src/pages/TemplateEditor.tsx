import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Eye, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useEmailTemplate, 
  useCreateEmailTemplate, 
  useUpdateEmailTemplate,
  useDeleteEmailTemplate
} from "@/hooks/use-email-templates";
import { 
  DEFAULT_MERGE_FIELDS,
  resolveMergeFields,
  type MergeField,
  type MergeContext
} from "@/types/email-automation";

const SAMPLE_CONTEXT: MergeContext = {
  person: {
    name: "John Doe",
    email: "john@example.com",
    title: "Marketing Manager",
    phone: "+1 555-0123",
    city: "New York",
  },
  entity: {
    name: "Acme Corp",
    email: "contact@acme.com",
    phone: "+1 555-0456",
  },
  sender: {
    name: "Jane Smith",
    email: "jane@company.com",
  },
  current_date: new Date().toLocaleDateString(),
};

export default function TemplateEditor() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !templateId || templateId === "new";

  const { data: template, isLoading } = useEmailTemplate(isNew ? undefined : templateId);
  
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  const deleteTemplate = useDeleteEmailTemplate();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  // Initialize form when template loads
  useEffect(() => {
    if (template) {
      setName(template.name);
      setSubject(template.subject);
      setBodyHtml(template.body_html);
      setBodyText(template.body_text || "");
      setIsActive(template.is_active);
    }
  }, [template]);

  const handleSave = async () => {
    if (!user) return;

    if (isNew) {
      const result = await createTemplate.mutateAsync({
        name,
        subject,
        body_html: bodyHtml,
        body_text: bodyText || null,
        is_active: isActive,
        created_by: user.id,
        merge_fields: DEFAULT_MERGE_FIELDS,
      });
      navigate(`/email-automation/templates/${result.id}`);
    } else {
      await updateTemplate.mutateAsync({
        id: templateId!,
        updates: {
          name,
          subject,
          body_html: bodyHtml,
          body_text: bodyText || null,
          is_active: isActive,
        },
      });
    }
  };

  const handleDelete = async () => {
    if (!templateId || isNew) return;
    if (confirm("Are you sure you want to delete this template?")) {
      await deleteTemplate.mutateAsync(templateId);
      navigate("/email-automation-hub");
    }
  };

  const insertMergeField = (token: string) => {
    setBodyHtml((prev) => prev + token);
  };

  if (isLoading && !isNew) {
    return <div className="p-6">Loading...</div>;
  }

  const resolvedSubject = resolveMergeFields(subject, SAMPLE_CONTEXT);
  const resolvedBody = resolveMergeFields(bodyHtml, SAMPLE_CONTEXT);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/email-automation-hub")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            {isNew ? "New Template" : "Edit Template"}
          </h1>
          <p className="text-muted-foreground">
            {isNew ? "Create a reusable email template" : template?.name}
          </p>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!name || !subject || !bodyHtml || createTemplate.isPending || updateTemplate.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Welcome Email"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Welcome to {{entity.name}}, {{person.name}}!"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Email Body</CardTitle>
                <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as "edit" | "preview")}>
                  <TabsList>
                    <TabsTrigger value="edit">
                      <Code className="h-4 w-4 mr-1" />
                      Edit
                    </TabsTrigger>
                    <TabsTrigger value="preview">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {previewMode === "edit" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bodyHtml">HTML Content</Label>
                    <Textarea
                      id="bodyHtml"
                      value={bodyHtml}
                      onChange={(e) => setBodyHtml(e.target.value)}
                      placeholder="<p>Hello {{person.name}},</p><p>Welcome to our platform!</p>"
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bodyText">Plain Text (optional)</Label>
                    <Textarea
                      id="bodyText"
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      placeholder="Hello {{person.name}}, Welcome to our platform!"
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/30">
                    <div className="text-sm text-muted-foreground mb-2">Subject:</div>
                    <div className="font-medium">{resolvedSubject}</div>
                  </div>
                  <div className="p-4 border rounded-lg bg-white min-h-[300px]">
                    <div 
                      dangerouslySetInnerHTML={{ __html: resolvedBody }}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Merge Fields Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Merge Fields</CardTitle>
              <CardDescription>
                Click to insert into email body
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {["person", "entity", "system"].map((category) => (
                    <div key={category}>
                      <h4 className="font-medium capitalize mb-2">{category} Fields</h4>
                      <div className="space-y-1">
                        {DEFAULT_MERGE_FIELDS
                          .filter((f) => f.category === category)
                          .map((field) => (
                            <Button
                              key={field.token}
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start font-mono text-xs"
                              onClick={() => insertMergeField(field.token)}
                            >
                              {field.token}
                            </Button>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sample Data</CardTitle>
              <CardDescription>
                Used for preview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-2 text-muted-foreground">
                <div><strong>Person:</strong> {SAMPLE_CONTEXT.person?.name}</div>
                <div><strong>Entity:</strong> {SAMPLE_CONTEXT.entity?.name}</div>
                <div><strong>Sender:</strong> {SAMPLE_CONTEXT.sender?.name}</div>
                <div><strong>Date:</strong> {SAMPLE_CONTEXT.current_date}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
