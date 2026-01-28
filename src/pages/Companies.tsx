import { useState, useEffect } from "react";
import { Building2, Plus, Search, Users, Mail, ExternalLink, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCRM } from "@/hooks/use-crm";
import { useToast } from "@/hooks/use-toast";
import type { Company, Person } from "@/types/crm";
import { useNavigate } from "react-router-dom";

// Temporary workspace ID - will be replaced with actual workspace context
const TEMP_WORKSPACE_ID = "temp-workspace";

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  
  const { listCompanies, listPeople, createCompany, updateCompany, deleteCompany } = useCRM();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [companiesData, peopleData] = await Promise.all([
        listCompanies(TEMP_WORKSPACE_ID),
        listPeople(TEMP_WORKSPACE_ID),
      ]);
      setCompanies(companiesData);
      setPeople(peopleData);
    } catch (error) {
      console.error("Failed to load companies:", error);
      toast({
        title: "Failed to load companies",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: FormData) => {
    try {
      const data = {
        name: formData.get("name") as string,
        domain: formData.get("domain") as string || undefined,
        website: formData.get("website") as string || undefined,
        industry: formData.get("industry") as string || undefined,
        notes: formData.get("notes") as string || undefined,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, data);
        toast({ title: "Company updated" });
      } else {
        await createCompany({
          ...data,
          workspace_id: TEMP_WORKSPACE_ID,
          created_by: "temp-user", // Will be replaced with actual user
        });
        toast({ title: "Company created" });
      }

      setDialogOpen(false);
      setEditingCompany(null);
      loadData();
    } catch (error) {
      toast({
        title: "Failed to save company",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`Delete ${company.name}? This will also remove all associated people.`)) return;

    try {
      await deleteCompany(company.id);
      toast({ title: "Company deleted" });
      loadData();
    } catch (error) {
      toast({
        title: "Failed to delete company",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const getPeopleCount = (companyId: string) => {
    return people.filter(p => p.company_id === companyId).length;
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.domain?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Companies</h1>
            <Badge variant="secondary">{companies.length}</Badge>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCompany(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCompany ? "Edit Company" : "New Company"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleSave(new FormData(e.currentTarget));
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input id="name" name="name" defaultValue={editingCompany?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input id="domain" name="domain" placeholder="example.com" defaultValue={editingCompany?.domain} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" name="website" placeholder="https://example.com" defaultValue={editingCompany?.website} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input id="industry" name="industry" placeholder="Technology" defaultValue={editingCompany?.industry} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={editingCompany?.notes} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCompany ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
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
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No companies yet</h3>
            <p className="text-muted-foreground mb-4">
              Companies will be auto-created when you receive emails
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => (
              <Card key={company.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCompany(company);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(company)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {company.domain && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ExternalLink className="h-4 w-4" />
                        <span>{company.domain}</span>
                      </div>
                    )}
                    {company.industry && (
                      <Badge variant="outline">{company.industry}</Badge>
                    )}
                    <div className="flex items-center gap-4 pt-2">
                      <button
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate(`/people?company=${company.id}`)}
                      >
                        <Users className="h-4 w-4" />
                        <span>{getPeopleCount(company.id)} people</span>
                      </button>
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
