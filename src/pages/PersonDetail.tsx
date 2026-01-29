import { useState, useEffect } from "react";
import { 
  Mail, Phone, Send, Clock, ArrowDownLeft, ArrowUpRight,
  Linkedin, Twitter, MapPin, Edit, Tag, Plus, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCRM } from "@/hooks/use-crm";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Person, EmailMessage, ObjectType } from "@/types/crm";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { NotesList } from "@/components/crm/NotesList";
import { TasksList } from "@/components/crm/TasksList";

export default function PersonDetail() {
  const { personId } = useParams<{ personId: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingObjectType, setAddingObjectType] = useState(false);
  
  const { getPerson, listEmailsByPerson, listObjectTypes, assignObjectTypeToPerson, removeObjectTypeFromPerson } = useCRM();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (personId) {
      loadData();
    }
  }, [personId]);

  const loadData = async () => {
    if (!personId) return;
    
    try {
      setLoading(true);
      const [personData, emailsData, objectTypesData] = await Promise.all([
        getPerson(personId),
        listEmailsByPerson(personId),
        listObjectTypes(),
      ]);
      setPerson(personData);
      setEmails(emailsData);
      setObjectTypes(objectTypesData);
    } catch (error) {
      console.error("Failed to load person:", error);
      toast({
        title: "Failed to load person",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignObjectType = async (objectTypeId: string) => {
    if (!personId || !user) return;
    
    try {
      await assignObjectTypeToPerson(personId, objectTypeId, 'manual', user.id);
      toast({ title: "Object type assigned" });
      setAddingObjectType(false);
      loadData();
    } catch (error) {
      toast({
        title: "Failed to assign object type",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRemoveObjectType = async (objectTypeId: string) => {
    if (!personId) return;
    
    try {
      await removeObjectTypeFromPerson(personId, objectTypeId);
      toast({ title: "Object type removed" });
      loadData();
    } catch (error) {
      toast({
        title: "Failed to remove object type",
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

  // Get object types not yet assigned to this person
  const availableObjectTypes = objectTypes.filter(
    ot => !person?.object_types?.some(pot => pot.object_type_id === ot.id)
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Person not found</p>
        <Button onClick={() => navigate("/people")}>Back to People</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={person.avatar_url} />
              <AvatarFallback className="text-xl">{getInitials(person.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{person.name}</h1>
                {person.is_auto_created && (
                  <Badge variant="outline" className="text-xs">Auto-created</Badge>
                )}
              </div>
              {person.title && (
                <p className="text-muted-foreground">{person.title}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <a href={`mailto:${person.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{person.email}</span>
                </a>
                {person.phone && (
                  <a href={`tel:${person.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{person.phone}</span>
                  </a>
                )}
                {person.city && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{person.city}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-2">
                {person.linkedin_url && (
                  <a
                    href={person.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {person.twitter_handle && (
                  <a
                    href={`https://x.com/${person.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Compose
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="activity" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 px-6">
            <TabsTrigger
              value="activity"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              <Clock className="h-4 w-4 mr-2" />
              Activity
              <Badge variant="secondary" className="ml-2">{emails.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Tasks
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Notes
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
            >
              Files
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              {emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Mail className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium mb-1">No email activity yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Email interactions with this person will appear here
                  </p>
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Send first email
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className="p-4 hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 p-1.5 rounded-full ${
                          email.direction === 'inbound' 
                            ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {email.direction === 'inbound' ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-medium truncate ${!email.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {email.subject || "(No subject)"}
                            </p>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {email.body_preview}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {email.direction === 'inbound' ? 'Received' : 'Sent'}
                            </Badge>
                            {email.has_attachments && (
                              <Badge variant="outline" className="text-xs">Attachments</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              {personId && (
                <TasksList entityTable="people" entityId={personId} />
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notes" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-full">
              {personId && (
                <NotesList entityTable="people" entityId={personId} />
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="files" className="flex-1 m-0 p-6">
            <p className="text-sm text-muted-foreground">No files yet</p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Details Panel */}
      <div className="w-80 border-l p-6 overflow-auto">
        <h3 className="font-semibold mb-4">Details</h3>
        <div className="space-y-4 text-sm">
          {/* Object Types Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Object Types</p>
              {availableObjectTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setAddingObjectType(!addingObjectType)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {addingObjectType && (
              <div className="mb-2">
                <Select onValueChange={handleAssignObjectType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select object type..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {availableObjectTypes.map(ot => (
                      <SelectItem key={ot.id} value={ot.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: ot.color }}
                          />
                          {ot.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex flex-wrap gap-1">
              {person.object_types?.map((pot) => (
                <Badge
                  key={pot.id}
                  variant="outline"
                  className="text-xs group"
                  style={{
                    borderColor: pot.object_type?.color,
                    color: pot.object_type?.color,
                  }}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {pot.object_type?.name}
                  <button
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveObjectType(pot.object_type_id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {(!person.object_types || person.object_types.length === 0) && !addingObjectType && (
                <p className="text-muted-foreground text-xs">No object types assigned</p>
              )}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Created</p>
            <p>{format(new Date(person.created_at), "MMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(person.created_at), { addSuffix: true })}
            </p>
          </div>

          {person.title && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Title</p>
                <p>{person.title}</p>
              </div>
            </>
          )}

          {person.city && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Location</p>
                <p>{person.city}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
