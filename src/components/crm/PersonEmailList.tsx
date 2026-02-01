import { Mail, Paperclip, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { usePersonEmails } from "@/hooks/use-person-emails";
import { cn } from "@/lib/utils";

interface PersonEmailListProps {
  personId: string;
}

export function PersonEmailList({ personId }: PersonEmailListProps) {
  const { data: emails = [], isLoading } = usePersonEmails(personId);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <h4 className="font-medium text-sm mb-1">No Email History</h4>
        <p className="text-xs text-muted-foreground">
          No emails linked to this person yet
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {emails.map((email) => (
          <div
            key={email.id}
            className={cn(
              "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
              !email.is_read && "bg-primary/5"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {email.direction === "inbound" ? (
                  <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-sm truncate",
                    !email.is_read && "font-semibold"
                  )}>
                    {email.subject || "(No subject)"}
                  </p>
                  {email.has_attachments && (
                    <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {email.direction === "inbound" ? "From: " : "To: "}
                  {email.sender_name || email.sender_email || "Unknown"}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {email.body_preview || "No preview available"}
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
