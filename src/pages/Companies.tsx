import { useState, useEffect } from "react";
import { 
  Building2, Plus, Globe, Calendar, Users as UsersIcon, 
  Linkedin, MapPin, UserCircle, User
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDistanceToNow } from "date-fns";

const columns = [
  { key: "select", label: "", icon: null, width: "w-10" },
  { key: "name", label: "Name", icon: Building2, width: "min-w-[180px]" },
  { key: "domain", label: "Domain", icon: Globe, width: "min-w-[150px]" },
  { key: "created_by", label: "Created by", icon: User, width: "min-w-[130px]" },
  { key: "account_owner", label: "Account Owner", icon: UserCircle, width: "min-w-[150px]" },
  { key: "created_at", label: "Creation date", icon: Calendar, width: "min-w-[130px]" },
  { key: "employees", label: "Employees", icon: UsersIcon, width: "min-w-[100px]" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, width: "min-w-[100px]" },
  { key: "address", label: "Address", icon: MapPin, width: "min-w-[150px]" },
  { key: "add", label: "+", icon: null, width: "w-10" },
];

export default function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { listCompanies, listPeople, createCompany, updateCompany, deleteCompany } = useCRM();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [companiesData, peopleData] = await Promise.all([
        listCompanies(workspaceId),
        listPeople(workspaceId),
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
    if (!workspaceId || !user) return;
    try {
      const employeesValue = formData.get("employees") as string;
      const data = {
        name: formData.get("name") as string,
        domain: formData.get("domain") as string || undefined,
        website: formData.get("website") as string || undefined,
        industry: formData.get("industry") as string || undefined,
        employees: employeesValue ? parseInt(employeesValue, 10) : undefined,
        linkedin_url: formData.get("linkedin_url") as string || undefined,
        address: formData.get("address") as string || undefined,
        notes: formData.get("notes") as string || undefined,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, data);
        toast({ title: "Company updated" });
      } else {
        await createCompany({
          ...data,
          workspace_id: workspaceId,
          created_by: user.id,
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

  const getPeopleCount = (companyId: string) => {
    return people.filter(p => p.company_id === companyId).length;
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
    if (selectedIds.size === companies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies.map(c => c.id)));
    }
  };

  const totalEmployees = companies.reduce((sum, c) => sum + (c.employees || 0), 0);
  const aggregations = [
    { label: "Count all", value: companies.length },
    { label: "Total employees", value: totalEmployees },
    { label: "With domain", value: companies.filter(c => c.domain).length },
  ];

  return (
    <div className="h-full flex bg-background">
      {/* Main Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <CRMTableHeader title="Companies" count={companies.length} />

        {loading || workspaceLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Loading companies...</p>
          </div>
        ) : !workspaceId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Please log in to view companies</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
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
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead key={col.key} className={`${col.width} bg-muted/50`}>
                      {col.key === "select" ? (
                        <Checkbox
                          checked={selectedIds.size === companies.length && companies.length > 0}
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
                {companies.map((company) => (
                  <TableRow
                    key={company.id}
                    className={`cursor-pointer ${selectedCompany?.id === company.id ? "bg-muted" : ""}`}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(company.id)}
                        onCheckedChange={() => toggleSelect(company.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="font-medium truncate">{company.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.domain ? (
                        <a
                          href={`https://${company.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {company.domain}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(company.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.employees || "—"}
                    </TableCell>
                    <TableCell>
                      {company.linkedin_url ? (
                        <a
                          href={company.linkedin_url}
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
                    <TableCell className="text-muted-foreground truncate max-w-[200px]">
                      {company.address || "—"}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                <AddNewRow colSpan={columns.length} onClick={() => setDialogOpen(true)} label="Add New" />
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        {companies.length > 0 && <TableFooter aggregations={aggregations} />}
      </div>

      {/* Detail Panel */}
      <DetailPanel
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        title={selectedCompany?.name || ""}
        subtitle={selectedCompany?.industry}
        createdAt={selectedCompany?.created_at}
      >
        {selectedCompany && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">People</h4>
              <p className="text-sm">{getPeopleCount(selectedCompany.id)} contacts</p>
            </div>
            {selectedCompany.website && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Website</h4>
                <a
                  href={selectedCompany.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {selectedCompany.website}
                </a>
              </div>
            )}
            {selectedCompany.notes && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Notes</h4>
                <p className="text-sm">{selectedCompany.notes}</p>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" name="domain" placeholder="example.com" defaultValue={editingCompany?.domain} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" placeholder="https://example.com" defaultValue={editingCompany?.website} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" name="industry" placeholder="Technology" defaultValue={editingCompany?.industry} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employees">Employees</Label>
                <Input id="employees" name="employees" type="number" placeholder="100" defaultValue={editingCompany?.employees} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin_url">LinkedIn URL</Label>
              <Input id="linkedin_url" name="linkedin_url" placeholder="https://linkedin.com/company/..." defaultValue={editingCompany?.linkedin_url} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" placeholder="123 Main St, San Francisco, CA" defaultValue={editingCompany?.address} />
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
  );
}
