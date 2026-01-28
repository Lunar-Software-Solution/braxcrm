import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Phone, Building2, Send, Clock, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCRM } from "@/hooks/use-crm";
import { useToast } from "@/hooks/use-toast";
import type { Person, EmailMessage } from "@/types/crm";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";

export default function PersonDetail() {
  const { personId } = useParams<{ personId: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { getPerson, listEmailsByPerson } = useCRM();
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
      const [personData, emailsData] = await Promise.all([
        getPerson(personId),
        listEmailsByPerson(personId),
      ]);
      setPerson(personData);
      setEmails(emailsData);
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <p className="text-muted-foreground mb-4">Person not found</p>
        <Button onClick={() => navigate("/people")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to People
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <Button variant="ghost" onClick={() => navigate("/people")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to People
        </Button>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={person.avatar_url} />
            <AvatarFallback className="text-xl">{getInitials(person.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{person.name}</h1>
            {person.title && (
              <p className="text-muted-foreground">{person.title}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{person.email}</span>
              </div>
              {person.phone && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{person.phone}</span>
                </div>
              )}
              {person.company && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{person.company.name}</span>
                </div>
              )}
            </div>
          </div>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Compose Email
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Activity Timeline */}
        <div className="flex-1 border-r">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Email Activity
              <Badge variant="secondary">{emails.length}</Badge>
            </h2>
          </div>
          <ScrollArea className="h-[calc(100vh-220px)]">
            {emails.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No email activity yet
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
                          ? 'bg-green-100 text-green-600' 
                          : 'bg-blue-100 text-blue-600'
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
        </div>

        {/* Details Panel */}
        <div className="w-80 p-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {person.company && (
                <div>
                  <p className="text-muted-foreground">Company</p>
                  <p className="font-medium">{person.company.name}</p>
                  {person.company.domain && (
                    <p className="text-xs text-muted-foreground">{person.company.domain}</p>
                  )}
                </div>
              )}
              <Separator />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{format(new Date(person.created_at), "MMM d, yyyy")}</p>
              </div>
              {person.is_auto_created && (
                <>
                  <Separator />
                  <Badge variant="outline">Auto-created from email</Badge>
                </>
              )}
              {person.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap">{person.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
