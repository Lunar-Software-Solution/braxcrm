import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useImportEndpoints } from "@/hooks/use-import-endpoints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { ImportEndpoint } from "@/types/imports";
import { WebflowSyncPanel } from "@/components/import/WebflowSyncPanel";

const ENTITY_TABLES = [
  { value: "influencers", label: "Influencers" },
  { value: "resellers", label: "Resellers" },
  { value: "product_suppliers", label: "Product Suppliers" },
  { value: "expense_suppliers", label: "Expense Suppliers" },
  { value: "corporate_management", label: "Corporate Management" },
  { value: "personal_contacts", label: "Personal Contacts" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "marketing_sources", label: "Marketing Sources" },
  { value: "merchant_accounts", label: "Merchant Accounts" },
  { value: "logistic_suppliers", label: "Logistic Suppliers" },
];

interface EndpointFormData {
  name: string;
  slug: string;
  description: string;
  default_entity_table: string;
  is_active: boolean;
}

const initialFormData: EndpointFormData = {
  name: "",
  slug: "",
  description: "",
  default_entity_table: "",
  is_active: true,
};

export default function ImportEndpoints() {
  const { endpoints, isLoading, createEndpoint, updateEndpoint, deleteEndpoint, rotateSecret } = useImportEndpoints();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<ImportEndpoint | null>(null);
  const [formData, setFormData] = useState<EndpointFormData>(initialFormData);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  const importBaseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-ingest`;

  const openCreateDialog = () => {
    setEditingEndpoint(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (endpoint: ImportEndpoint) => {
    setEditingEndpoint(endpoint);
    setFormData({
      name: endpoint.name,
      slug: endpoint.slug,
      description: endpoint.description || "",
      default_entity_table: endpoint.default_entity_table || "",
      is_active: endpoint.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Name and slug are required");
      return;
    }

    const payload = {
      name: formData.name,
      slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      description: formData.description || null,
      default_entity_table: formData.default_entity_table || null,
      is_active: formData.is_active,
      allowed_object_types: [] as string[],
    };

    if (editingEndpoint) {
      await updateEndpoint.mutateAsync({ id: editingEndpoint.id, ...payload });
    } else {
      await createEndpoint.mutateAsync(payload);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this endpoint? Existing webhook events will be preserved.")) {
      await deleteEndpoint.mutateAsync(id);
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    if (confirm("Regenerate secret key? You'll need to update external systems.")) {
      await rotateSecret.mutateAsync(id);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleSecretVisibility = (id: string) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(id)) {
      newVisible.delete(id);
    } else {
      newVisible.add(id);
    }
    setVisibleSecrets(newVisible);
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Import Endpoints</h1>
          <p className="text-muted-foreground">
            Configure endpoints and integrations for external data
          </p>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Webhook Endpoints</TabsTrigger>
          <TabsTrigger value="webflow">Webflow</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["import-endpoints"] })}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Endpoint
            </Button>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Webhook URL</TableHead>
                  <TableHead>Secret Key</TableHead>
                  <TableHead>Default Entity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : endpoints?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No webhook endpoints configured
                    </TableCell>
                  </TableRow>
                ) : (
                  endpoints?.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{endpoint.name}</div>
                          {endpoint.description && (
                            <div className="text-sm text-muted-foreground">{endpoint.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                            {importBaseUrl}/{endpoint.slug}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(`${importBaseUrl}/${endpoint.slug}`, "URL")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate">
                            {visibleSecrets.has(endpoint.id) 
                              ? endpoint.secret_key 
                              : "••••••••••••"}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleSecretVisibility(endpoint.id)}
                          >
                            {visibleSecrets.has(endpoint.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(endpoint.secret_key, "Secret")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {endpoint.default_entity_table ? (
                          <Badge variant="secondary">
                            {ENTITY_TABLES.find(t => t.value === endpoint.default_entity_table)?.label || endpoint.default_entity_table}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">AI Classification</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={endpoint.is_active ? "default" : "secondary"}>
                          {endpoint.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(endpoint)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRegenerateSecret(endpoint.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(endpoint.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="webflow">
          <WebflowSyncPanel />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEndpoint ? "Edit Endpoint" : "Create Webhook Endpoint"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    name: e.target.value,
                    slug: editingEndpoint ? formData.slug : generateSlug(e.target.value),
                  });
                }}
                placeholder="Shopify Orders"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="shopify-orders"
              />
              <p className="text-xs text-muted-foreground">
                Import URL: {importBaseUrl}/{formData.slug || "your-slug"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Receives order data from Shopify..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_entity">Default Entity Type</Label>
              <Select
                value={formData.default_entity_table}
                onValueChange={(value) => setFormData({ ...formData, default_entity_table: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use AI Classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Use AI Classification</SelectItem>
                  {ENTITY_TABLES.map((table) => (
                    <SelectItem key={table.value} value={table.value}>
                      {table.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createEndpoint.isPending || updateEndpoint.isPending}
            >
              {editingEndpoint ? "Save Changes" : "Create Endpoint"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
