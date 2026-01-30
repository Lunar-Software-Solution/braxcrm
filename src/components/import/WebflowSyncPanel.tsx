import { useState, useEffect } from "react";
import { useWebflowSync, WebflowForm } from "@/hooks/use-webflow-sync";
import { useImportEndpoints } from "@/hooks/use-import-endpoints";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, RefreshCw, Play, Clock, AlertCircle, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WebflowTokenManager } from "./WebflowTokenManager";

interface WebflowConfigFormData {
  site_id: string;
  form_id: string;
  form_name: string;
  endpoint_id: string;
  is_active: boolean;
}

const initialFormData: WebflowConfigFormData = {
  site_id: "",
  form_id: "",
  form_name: "",
  endpoint_id: "",
  is_active: true,
};

export function WebflowSyncPanel() {
  const { 
    configs, 
    isLoading, 
    createConfig, 
    deleteConfig, 
    triggerSync,
    configuredSites,
    sitesLoading,
    fetchForms,
  } = useWebflowSync();
  const { endpoints } = useImportEndpoints();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<WebflowConfigFormData>(initialFormData);
  const [availableForms, setAvailableForms] = useState<WebflowForm[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);

  // When site changes, fetch its forms
  useEffect(() => {
    let cancelled = false;
    
    if (formData.site_id) {
      setFormsLoading(true);
      setAvailableForms([]);
      fetchForms.mutateAsync(formData.site_id)
        .then((forms) => {
          if (cancelled) return;
          // Deduplicate forms by ID first, then by displayName as fallback
          const seenIds = new Set<string>();
          const seenNames = new Set<string>();
          const uniqueForms = forms.filter((form) => {
            if (seenIds.has(form.id) || seenNames.has(form.displayName)) {
              return false;
            }
            seenIds.add(form.id);
            seenNames.add(form.displayName);
            return true;
          });
          setAvailableForms(uniqueForms);
        })
        .catch((err) => {
          if (!cancelled) console.error("Failed to fetch forms:", err);
        })
        .finally(() => {
          if (!cancelled) setFormsLoading(false);
        });
    } else {
      setAvailableForms([]);
    }
    
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.site_id]);

  const handleSubmit = async () => {
    if (!formData.site_id) {
      return;
    }

    // Find the selected form to get its display name
    const selectedForm = availableForms.find(f => f.id === formData.form_id);
    
    await createConfig.mutateAsync({
      site_id: formData.site_id,
      form_id: formData.form_id || undefined,
      form_name: selectedForm?.displayName || formData.form_name || undefined,
      endpoint_id: formData.endpoint_id || undefined,
      is_active: formData.is_active,
    });

    setIsDialogOpen(false);
    setFormData(initialFormData);
    setAvailableForms([]);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this Webflow sync configuration?")) {
      await deleteConfig.mutateAsync(id);
    }
  };

  const handleTriggerSync = async (configId?: string) => {
    await triggerSync.mutateAsync(configId);
  };

  const getSiteName = (siteId: string) => {
    const site = configuredSites?.find(s => s.site_id === siteId);
    return site?.site_name || siteId;
  };

  return (
    <div className="space-y-6">
      {/* Token Manager */}
      <WebflowTokenManager />
      
      {/* Sync Configurations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.927 7.715c-.963 5.363-3.99 8.79-8.513 10.27-2.39.78-5.013.587-6.912-.514-1.9-1.1-3.263-2.974-3.808-5.237-.546-2.264-.183-4.679 1.014-6.75C6.898 3.31 8.99 1.977 11.4 1.615c2.41-.362 4.926.275 7.027 1.78 2.1 1.507 3.653 3.82 4.35 6.47l.01.04c.086.34.14.67.14.81z"/>
                </svg>
                Webflow Form Sync
              </CardTitle>
              <CardDescription>
                Automatically import form submissions from Webflow every hour
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTriggerSync()}
                disabled={triggerSync.isPending}
              >
                {triggerSync.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Sync Now
              </Button>
              <Button size="sm" onClick={() => setIsDialogOpen(true)} disabled={!configuredSites?.length}>
                <Plus className="h-4 w-4 mr-2" />
                Add Form
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : configs?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No Webflow forms configured for sync</p>
            <p className="text-sm mt-1">Add a form to start importing submissions automatically</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Site</TableHead>
                <TableHead>Form</TableHead>
                <TableHead>Import Endpoint</TableHead>
                <TableHead>Last Synced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs?.map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-medium">{getSiteName(config.site_id)}</TableCell>
                  <TableCell>
                    {config.form_name || config.form_id || (
                      <span className="text-muted-foreground">All forms</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {config.endpoint ? (
                      <Badge variant="secondary">{config.endpoint.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Default</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {config.last_synced_at ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(config.last_synced_at), { addSuffix: true })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.is_active ? "default" : "secondary"}>
                      {config.is_active ? "Active" : "Paused"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTriggerSync(config.id)}
                        disabled={triggerSync.isPending}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        </CardContent>
      </Card>
      {/* Add Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webflow Form Sync</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!configuredSites?.length && !sitesLoading && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Add a site token first to configure form syncing.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="site_id">Webflow Site</Label>
              <Select
                value={formData.site_id}
                onValueChange={(value) => setFormData({ ...formData, site_id: value, form_id: "", form_name: "" })}
                disabled={sitesLoading || !configuredSites?.length}
              >
                <SelectTrigger>
                  <SelectValue placeholder={sitesLoading ? "Loading sites..." : "Select a site"} />
                </SelectTrigger>
                <SelectContent>
                  {configuredSites?.map((site) => (
                    <SelectItem key={site.site_id} value={site.site_id}>
                      {site.site_name || site.site_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.site_id && (
              <div className="space-y-2">
                <Label htmlFor="form_id">Form</Label>
                <Select
                  value={formData.form_id || "all"}
                  onValueChange={(value) => {
                    const form = availableForms.find(f => f.id === value);
                    setFormData({ 
                      ...formData, 
                      form_id: value === "all" ? "" : value,
                      form_name: form?.displayName || ""
                    });
                  }}
                  disabled={formsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formsLoading ? "Loading forms..." : "Select a form"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All forms</SelectItem>
                    {availableForms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formsLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading forms...
                  </div>
                )}
                {!formsLoading && availableForms.length === 0 && formData.site_id && (
                  <p className="text-xs text-muted-foreground">
                    No forms found for this site. Forms will appear after you add one in Webflow.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="endpoint_id">Import Endpoint</Label>
              <Select
                value={formData.endpoint_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, endpoint_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use default (AI Classification)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Use default (AI Classification)</SelectItem>
                  {endpoints?.map((endpoint) => (
                    <SelectItem key={endpoint.id} value={endpoint.id}>
                      {endpoint.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Link to an endpoint to use its default entity type
              </p>
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
            <Button onClick={handleSubmit} disabled={createConfig.isPending || !formData.site_id}>
              {createConfig.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
