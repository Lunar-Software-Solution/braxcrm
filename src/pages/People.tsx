import { useState, useEffect } from "react";
import { 
  Users, Plus, Mail, Building2, Phone, Calendar, Briefcase, 
  MapPin, Linkedin, Twitter, User
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TableHeader as CRMTableHeader } from "@/components/crm/TableHeader";
import { TableFooter } from "@/components/crm/TableFooter";
import { DetailPanel } from "@/components/crm/DetailPanel";
import { AddNewRow } from "@/components/crm/AddNewRow";
import { useCRM } from "@/hooks/use-crm";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Company, Person } from "@/types/crm";
import { useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const columns = [
  { key: "select", label: "", icon: null, width: "w-10" },
  { key: "name", label: "Name", icon: User, width: "min-w-[180px]" },
  { key: "email", label: "Emails", icon: Mail, width: "min-w-[200px]" },
  { key: "company", label: "Company", icon: Building2, width: "min-w-[150px]" },
  { key: "phone", label: "Phones", icon: Phone, width: "min-w-[130px]" },
  { key: "title", label: "Job Title", icon: Briefcase, width: "min-w-[150px]" },
  { key: "city", label: "City", icon: MapPin, width: "min-w-[120px]" },
  { key: "created_at", label: "Creation date", icon: Calendar, width: "min-w-[130px]" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, width: "min-w-[100px]" },
  { key: "twitter", label: "X", icon: Twitter, width: "min-w-[100px]" },
  { key: "add", label: "+", icon: null, width: "w-10" },
];

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { listPeople, listCompanies, createPerson, updatePerson, deletePerson, listEmailsByPerson } = useCRM();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const companyFilter = searchParams.get("company");

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId, companyFilter]);

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [peopleData, companiesData] = await Promise.all([
        listPeople(workspaceId, companyFilter ? { companyId: companyFilter } : undefined),
        listCompanies(workspaceId),
      ]);
      setPeople(peopleData);
      setCompanies(companiesData);
    } catch (error) {
      console.error("Failed to load people:", error);
      toast({
        title: "Failed to load people",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: FormData) => {
    if (!workspaceId || !user) return;
    try {
      const companyId = formData.get("company_id") as string;
      const data = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        title: formData.get("title") as string || undefined,
        phone: formData.get("phone") as string || undefined,
        city: formData.get("city") as string || undefined,
        linkedin_url: formData.get("linkedin_url") as string || undefined,
        twitter_handle: formData.get("twitter_handle") as string || undefined,
        notes: formData.get("notes") as string || undefined,
        company_id: companyId === "none" ? undefined : companyId,
      };

      if (editingPerson) {
        await updatePerson(editingPerson.id, data);
        toast({ title: "Person updated" });
      } else {
        await createPerson({
          ...data,
          workspace_id: workspaceId,
          is_auto_created: false,
          created_by: user.id,
        });
        toast({ title: "Person created" });
      }

      setDialogOpen(false);
      setEditingPerson(null);
      loadData();
    } catch (error) {
      toast({
        title: "Failed to save person",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === people.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(people.map(p => p.id)));
    }
  };

  const aggregations = [
    { label: "Count all", value: people.length },
    { label: "Unique companies", value: new Set(people.filter(p => p.company_id).map(p => p.company_id)).size },
    { label: "With email", value: people.filter(p => p.email).length },
  ];

  return (
    <div className="h-full flex bg-background">
      {/* Main Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <CRMTableHeader title="People" count={people.length} />

        {loading || workspaceLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading people...</p>
          </div>
        ) : !workspaceId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Please log in to view people</p>
          </div>
        ) : people.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No people yet</h3>
            <p className="text-muted-foreground mb-4">
              People will be auto-created when you receive emails
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Person
            </Button>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead key={col.key} className={`${col.width} bg-muted/50`}>
                      {col.key === "select" ? (
                        <Checkbox
                          checked={selectedIds.size === people.length && people.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      ) : col.key === "add" ? (
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Plus className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          {col.icon && <col.icon className="h-3.5 w-3.5" />}
                          {col.label}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person) => (
                  <TableRow
                    key={person.id}
                    className={`cursor-pointer ${selectedPerson?.id === person.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedPerson(person)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(person.id)}
                        onCheckedChange={() => toggleSelect(person.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={person.avatar_url} />
                          <AvatarFallback className="text-xs">{getInitials(person.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">{person.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground truncate">{person.email}</TableCell>
                    <TableCell>
                      {person.company && (
                        <span className="text-muted-foreground">{person.company.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{person.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{person.title || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{person.city || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(person.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {person.linkedin_url ? (
                        <a
                          href={person.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {person.twitter_handle ? (
                        <a
                          href={`https://x.com/${person.twitter_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          @{person.twitter_handle}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                <AddNewRow colSpan={columns.length} onClick={() => setDialogOpen(true)} label="Add New" />
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {people.length > 0 && <TableFooter aggregations={aggregations} />}
      </div>

      {/* Detail Panel */}
      <DetailPanel
        isOpen={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        title={selectedPerson?.name || ""}
        subtitle={selectedPerson?.title}
        avatarUrl={selectedPerson?.avatar_url}
        createdAt={selectedPerson?.created_at}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPerson ? "Edit Person" : "New Person"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={editingPerson?.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" defaultValue={editingPerson?.email} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_id">Company</Label>
                <Select name="company_id" defaultValue={editingPerson?.company_id || "none"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="none">No company</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="CEO" defaultValue={editingPerson?.title} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" placeholder="+1 555-1234" defaultValue={editingPerson?.phone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" placeholder="San Francisco" defaultValue={editingPerson?.city} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/in/..." defaultValue={editingPerson?.linkedin_url} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter_handle">X Handle</Label>
                <Input id="twitter_handle" name="twitter_handle" placeholder="username" defaultValue={editingPerson?.twitter_handle} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={editingPerson?.notes} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingPerson ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
