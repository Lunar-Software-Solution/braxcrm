import { useState } from "react";
import { Plus, MessageSquare, Copy, Check, Trash2, Power, PowerOff, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/alert-dialog";
import {
  useMessagingConnections,
  useCreateMessagingConnection,
  useUpdateMessagingConnection,
  useDeleteMessagingConnection,
  generateApiSecret,
} from "@/hooks/use-messaging-connections";
import type { MessagingPlatform, MessagingConnection } from "@/types/messaging";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/types/messaging";

export default function MessagingConnections() {
  const { data: connections = [], isLoading } = useMessagingConnections();
  const createConnection = useCreateMessagingConnection();
  const updateConnection = useUpdateMessagingConnection();
  const deleteConnection = useDeleteMessagingConnection();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MessagingConnection | null>(null);
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  // Form state
  const [newPlatform, setNewPlatform] = useState<MessagingPlatform>("whatsapp");
  const [newConnectionId, setNewConnectionId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newApiSecret, setNewApiSecret] = useState(() => generateApiSecret());

  const handleCreate = async () => {
    if (!newConnectionId.trim()) {
      toast.error("Connection ID is required");
      return;
    }

    try {
      await createConnection.mutateAsync({
        platform: newPlatform,
        connection_id: newConnectionId.trim(),
        display_name: newDisplayName.trim() || undefined,
        phone_number: newPhoneNumber.trim() || undefined,
        username: newUsername.trim() || undefined,
        api_secret: newApiSecret,
      });
      toast.success("Connection created successfully");
      setShowCreateDialog(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create connection");
    }
  };

  const handleToggleActive = async (connection: MessagingConnection) => {
    try {
      await updateConnection.mutateAsync({
        id: connection.id,
        updates: { is_active: !connection.is_active },
      });
      toast.success(connection.is_active ? "Connection disabled" : "Connection enabled");
    } catch (error) {
      toast.error("Failed to update connection");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteConnection.mutateAsync(deleteTarget.id);
      toast.success("Connection deleted");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Failed to delete connection");
    }
  };

  const handleCopySecret = (connectionId: string, secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(connectionId);
    toast.success("API secret copied to clipboard");
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  const resetForm = () => {
    setNewPlatform("whatsapp");
    setNewConnectionId("");
    setNewDisplayName("");
    setNewPhoneNumber("");
    setNewUsername("");
    setNewApiSecret(generateApiSecret());
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Messaging Connections
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage connections from external messaging services
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-lg mb-1">No connections yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create a connection to start importing messages from WhatsApp, Signal, Telegram, or WeChat.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      style={{
                        backgroundColor: PLATFORM_COLORS[connection.platform],
                        color: "white",
                      }}
                    >
                      {PLATFORM_LABELS[connection.platform]}
                    </Badge>
                    <div>
                      <CardTitle className="text-lg">
                        {connection.display_name || connection.connection_id}
                      </CardTitle>
                      <CardDescription>
                        ID: {connection.connection_id}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={connection.is_active ? "default" : "secondary"}>
                      {connection.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  {connection.phone_number && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>{" "}
                      {connection.phone_number}
                    </div>
                  )}
                  {connection.username && (
                    <div>
                      <span className="text-muted-foreground">Username:</span>{" "}
                      {connection.username}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Last sync:</span>{" "}
                    {connection.last_synced_at
                      ? format(new Date(connection.last_synced_at), "MMM d, yyyy h:mm a")
                      : "Never"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{" "}
                    {format(new Date(connection.created_at), "MMM d, yyyy")}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(connection)}
                  >
                    {connection.is_active ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-1" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-1" />
                        Enable
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopySecret(connection.id, connection.api_secret || "")}
                  >
                    {copiedSecret === connection.id ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy API Secret
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(connection)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Messaging Connection</DialogTitle>
            <DialogDescription>
              Create a new connection to receive messages from an external service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={newPlatform} onValueChange={(v) => setNewPlatform(v as MessagingPlatform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="signal">Signal</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="wechat">WeChat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Connection ID *</Label>
              <Input
                placeholder="unique-connection-id"
                value={newConnectionId}
                onChange={(e) => setNewConnectionId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A unique identifier for this connection (provided by your external service)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder="My WhatsApp Business"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="+1234567890"
                  value={newPhoneNumber}
                  onChange={(e) => setNewPhoneNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  placeholder="@username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>API Secret</Label>
              <div className="flex gap-2">
                <Input value={newApiSecret} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setNewApiSecret(generateApiSecret())}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this secret as the x-api-key header when pushing messages
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createConnection.isPending}>
              Create Connection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this connection? This will also delete all imported conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
