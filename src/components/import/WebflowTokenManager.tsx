import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Key, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useWebflowSync, type WebflowSite } from "@/hooks/use-webflow-sync";

export function WebflowTokenManager() {
  const { configuredSites, sitesLoading, validateToken, addToken, deleteToken } = useWebflowSync();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [validatedSites, setValidatedSites] = useState<WebflowSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [validationState, setValidationState] = useState<"idle" | "validating" | "valid" | "invalid">("idle");

  const handleValidateToken = async () => {
    if (!apiToken.trim()) return;
    
    setValidationState("validating");
    setValidatedSites([]);
    setSelectedSiteId("");

    try {
      const result = await validateToken.mutateAsync(apiToken);
      if (result.valid && result.sites) {
        setValidatedSites(result.sites);
        setValidationState("valid");
        if (result.sites.length === 1) {
          setSelectedSiteId(result.sites[0].id);
        }
      } else {
        setValidationState("invalid");
      }
    } catch {
      setValidationState("invalid");
    }
  };

  const handleAddToken = async () => {
    if (!selectedSiteId || !apiToken) return;
    
    const site = validatedSites.find(s => s.id === selectedSiteId);
    if (!site) return;

    await addToken.mutateAsync({
      siteId: site.id,
      siteName: site.displayName,
      apiToken,
    });

    // Reset form
    setApiToken("");
    setValidatedSites([]);
    setSelectedSiteId("");
    setValidationState("idle");
    setDialogOpen(false);
  };

  const handleDeleteToken = async (siteId: string) => {
    if (confirm("Remove this site token?")) {
      await deleteToken.mutateAsync(siteId);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Webflow Site Tokens
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Site Token
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Webflow Site Token</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>API Token</Label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="Paste your Webflow API token"
                    value={apiToken}
                    onChange={(e) => {
                      setApiToken(e.target.value);
                      setValidationState("idle");
                      setValidatedSites([]);
                    }}
                  />
                  <Button 
                    onClick={handleValidateToken}
                    disabled={!apiToken.trim() || validationState === "validating"}
                  >
                    {validationState === "validating" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Validate"
                    )}
                  </Button>
                </div>
                {validationState === "valid" && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Token valid - {validatedSites.length} site(s) found
                  </p>
                )}
                {validationState === "invalid" && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    Invalid token. Check permissions (sites:read, forms:read)
                  </p>
                )}
              </div>

              {validatedSites.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Site</Label>
                  <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a site" />
                    </SelectTrigger>
                    <SelectContent>
                      {validatedSites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleAddToken}
                disabled={!selectedSiteId || addToken.isPending}
              >
                {addToken.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Add Site Token
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {sitesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !configuredSites?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No site tokens configured. Add a token to start syncing forms.
          </p>
        ) : (
          <div className="space-y-2">
            {configuredSites.map((site) => (
              <div
                key={site.site_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{site.site_name || site.site_id}</p>
                    <p className="text-xs text-muted-foreground">ID: {site.site_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Connected</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteToken(site.site_id)}
                    disabled={deleteToken.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}