import { useState, useEffect } from "react";
import { Users, Plus, Search, Mail, Building2, Trash2, Edit, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM } from "@/hooks/use-crm";
import { useToast } from "@/hooks/use-toast";
import type { Company, Person } from "@/types/crm";
import { useNavigate, useSearchParams } from "react-router-dom";

// Temporary workspace ID - will be replaced with actual workspace context
const TEMP_WORKSPACE_ID = "temp-workspace";

export default function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  
  const { listPeople, listCompanies, createPerson, updatePerson, deletePerson, listEmailsByPerson } = useCRM();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyFilter = searchParams.get("company");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [peopleData, companiesData] = await Promise.all([
        listPeople(TEMP_WORKSPACE_ID, companyFilter ? { companyId: companyFilter } : undefined),
        listCompanies(TEMP_WORKSPACE_ID),
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
    try {
      const companyId = formData.get("company_id") as string;
      const data = {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        title: formData.get("title") as string || undefined,
        phone: formData.get("phone") as string || undefined,
        notes: formData.get("notes") as string || undefined,
        company_id: companyId === "none" ? undefined : companyId,
      };

      if (editingPerson) {
        await updatePerson(editingPerson.id, data);
        toast({ title: "Person updated" });
      } else {
        await createPerson({
          ...data,
          workspace_id: TEMP_WORKSPACE_ID,
          is_auto_created: false,
          created_by: "temp-user", // Will be replaced with actual user
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

  const handleDelete = async (person: Person) => {
    if (!confirm(`Delete ${person.name}?`)) return;

    try {
      await deletePerson(person.id);
      toast({ title: "Person deleted" });
      loadData();
    } catch (error) {
      toast({
        title: "Failed to delete person",
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

  const filteredPeople = people.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.company?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            <h1 className="text-xl font-semibold">People</h1>
            <Badge variant="secondary">{people.length}</Badge>
            {companyFilter && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/people")}>
                Clear filter
              </Button>
            )}
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPerson(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPerson ? "Edit Person" : "New Person"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave(new FormData(e.currentTarget));
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" name="name" defaultValue={editingPerson?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingPerson?.email} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_id">Company</Label>
                  <Select name="company_id" defaultValue={editingPerson?.company_id || "none"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
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
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" placeholder="+1 555-1234" defaultValue={editingPerson?.phone} />
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
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading people...</p>
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPeople.map((person) => (
              <Card key={person.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={person.avatar_url} />
                      <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{person.name}</CardTitle>
                      {person.title && (
                        <p className="text-sm text-muted-foreground truncate">{person.title}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPerson(person);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(person)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{person.email}</span>
                    </div>
                    {person.company && (
                      <button
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/companies`)}
                      >
                        <Building2 className="h-4 w-4" />
                        <span>{person.company.name}</span>
                      </button>
                    )}
                    {person.is_auto_created && (
                      <Badge variant="outline" className="text-xs">Auto-created</Badge>
                    )}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/person/${person.id}`)}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        View Activity
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
