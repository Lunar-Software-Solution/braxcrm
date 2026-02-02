import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Mail, Building2, Globe } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Sender = Database["public"]["Tables"]["senders"]["Row"];
type SenderType = Database["public"]["Enums"]["sender_type"];

const SENDER_TYPES: { value: SenderType; label: string; color: string }[] = [
  { value: "automated", label: "Automated", color: "bg-blue-500/10 text-blue-500" },
  { value: "newsletter", label: "Newsletter", color: "bg-green-500/10 text-green-500" },
  { value: "shared_inbox", label: "Shared Inbox", color: "bg-purple-500/10 text-purple-500" },
  { value: "system", label: "System", color: "bg-gray-500/10 text-gray-500" },
];

const ENTITY_TABLES = [
  { value: "affiliates", label: "Affiliates" },
  { value: "resellers", label: "Resellers" },
  { value: "product_suppliers", label: "Product Suppliers" },
  { value: "services_suppliers", label: "Services Suppliers" },
  { value: "corporate_management", label: "Corporate Management" },
  { value: "personal_contacts", label: "Personal Contacts" },
  { value: "subscriptions", label: "Subscriptions" },
  { value: "marketing_sources", label: "Marketing Sources" },
];

export default function Senders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<Sender | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    display_name: "",
    domain: "",
    sender_type: "automated" as SenderType,
    entity_table: "",
    entity_id: "",
  });

  const { data: senders = [], isLoading } = useQuery({
    queryKey: ["senders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senders")
        .select("*")
        .order("email");
      if (error) throw error;
      return data as Sender[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("senders").insert({
        email: data.email,
        display_name: data.display_name || null,
        domain: data.domain || null,
        sender_type: data.sender_type,
        entity_table: data.entity_table || null,
        entity_id: data.entity_id || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
      toast.success("Sender created successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to create sender: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("senders")
        .update({
          email: data.email,
          display_name: data.display_name || null,
          domain: data.domain || null,
          sender_type: data.sender_type,
          entity_table: data.entity_table || null,
          entity_id: data.entity_id || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
      toast.success("Sender updated successfully");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update sender: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("senders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senders"] });
      toast.success("Sender deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete sender: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      display_name: "",
      domain: "",
      sender_type: "automated",
      entity_table: "",
      entity_id: "",
    });
    setEditingSender(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (sender: Sender) => {
    setEditingSender(sender);
    setFormData({
      email: sender.email,
      display_name: sender.display_name || "",
      domain: sender.domain || "",
      sender_type: sender.sender_type,
      entity_table: sender.entity_table || "",
      entity_id: sender.entity_id || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSender) {
      updateMutation.mutate({ id: editingSender.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getSenderTypeBadge = (type: SenderType) => {
    const typeConfig = SENDER_TYPES.find((t) => t.value === type);
    return (
      <Badge variant="secondary" className={typeConfig?.color}>
        {typeConfig?.label || type}
      </Badge>
    );
  };

  const getEntityLabel = (table: string | null) => {
    if (!table) return null;
    const entity = ENTITY_TABLES.find((e) => e.value === table);
    return entity?.label || table;
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Senders</h1>
          <p className="text-muted-foreground">
            Manage email senders and their entity mappings
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sender
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSender ? "Edit Sender" : "Add New Sender"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="sender@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  placeholder="Sender Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) =>
                    setFormData({ ...formData, domain: e.target.value })
                  }
                  placeholder="example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sender_type">Sender Type</Label>
                <Select
                  value={formData.sender_type}
                  onValueChange={(value: SenderType) =>
                    setFormData({ ...formData, sender_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SENDER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity_table">Entity Type</Label>
                <Select
                  value={formData.entity_table || "__none__"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, entity_table: value === "__none__" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {ENTITY_TABLES.map((entity) => (
                      <SelectItem key={entity.value} value={entity.value}>
                        {entity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingSender ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Entity Mapping</TableHead>
              <TableHead>Auto Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading senders...
                </TableCell>
              </TableRow>
            ) : senders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Mail className="h-8 w-8" />
                    <p>No senders found</p>
                    <p className="text-sm">
                      Senders are automatically created when emails are processed
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              senders.map((sender) => (
                <TableRow key={sender.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {sender.email}
                    </div>
                  </TableCell>
                  <TableCell>{sender.display_name || "—"}</TableCell>
                  <TableCell>
                    {sender.domain ? (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        {sender.domain}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{getSenderTypeBadge(sender.sender_type)}</TableCell>
                  <TableCell>
                    {sender.entity_table ? (
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {getEntityLabel(sender.entity_table)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not mapped</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sender.is_auto_created ? (
                      <Badge variant="outline">Auto</Badge>
                    ) : (
                      <Badge variant="secondary">Manual</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(sender)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this sender?")) {
                            deleteMutation.mutate(sender.id);
                          }
                        }}
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
    </div>
  );
}
