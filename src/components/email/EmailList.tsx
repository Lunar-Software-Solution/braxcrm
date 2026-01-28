import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  RefreshCw,
  MoreHorizontal,
  Paperclip,
  Flag,
  Star,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Email } from "@/types/email";
import { formatDistanceToNow } from "date-fns";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  folderName: string;
  onEmailSelect: (email: Email) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
}

export function EmailList({
  emails,
  selectedEmailId,
  folderName,
  onEmailSelect,
  onRefresh,
  isLoading = false,
}: EmailListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  const filteredEmails = emails.filter((email) => {
    const query = searchQuery.toLowerCase();
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from?.emailAddress.name.toLowerCase().includes(query) ||
      email.from?.emailAddress.address.toLowerCase().includes(query) ||
      email.bodyPreview.toLowerCase().includes(query)
    );
  });

  const toggleEmailSelection = (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedEmails(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === filteredEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(filteredEmails.map((e) => e.id)));
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-lg font-semibold">{folderName}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem>Mark all as read</DropdownMenuItem>
              <DropdownMenuItem>Sort by date</DropdownMenuItem>
              <DropdownMenuItem>Sort by sender</DropdownMenuItem>
              <DropdownMenuItem>Filter unread</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Bulk actions bar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 bg-muted/30">
        <Checkbox
          checked={selectedEmails.size === filteredEmails.length && filteredEmails.length > 0}
          onCheckedChange={toggleSelectAll}
          className="h-4 w-4"
        />
        <span className="text-xs text-muted-foreground">
          {filteredEmails.length} message{filteredEmails.length !== 1 ? "s" : ""}
        </span>
        {selectedEmails.size > 0 && (
          <>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-medium text-primary">
              {selectedEmails.size} selected
            </span>
          </>
        )}
      </div>

      {/* Email list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Loading emails...</p>
          </div>
        ) : (
        <div className="divide-y divide-border">
          {filteredEmails.map((email) => {
            const isSelected = selectedEmailId === email.id;
            const isChecked = selectedEmails.has(email.id);

            return (
              <button
                key={email.id}
                onClick={() => onEmailSelect(email)}
                className={cn(
                  "email-row w-full text-left px-3 py-2.5 flex gap-3 items-start",
                  isSelected && "email-row-selected",
                  !email.isRead && "bg-accent/30"
                )}
              >
                {/* Checkbox */}
                <div
                  className="pt-0.5"
                  onClick={(e) => toggleEmailSelection(email.id, e)}
                >
                  <Checkbox checked={isChecked} className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* From and date */}
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span
                      className={cn(
                        "truncate text-sm",
                        !email.isRead ? "font-semibold" : "text-muted-foreground"
                      )}
                    >
                      {email.from?.emailAddress.name || email.from?.emailAddress.address}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatEmailDate(email.receivedDateTime)}
                    </span>
                  </div>

                  {/* Subject */}
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {email.importance === "high" && (
                      <span className="text-destructive text-xs font-medium">!</span>
                    )}
                    <span
                      className={cn(
                        "truncate text-sm",
                        !email.isRead ? "font-medium" : "text-muted-foreground"
                      )}
                    >
                      {email.subject}
                    </span>
                  </div>

                  {/* Preview */}
                  <p className="text-xs text-muted-foreground truncate">
                    {email.bodyPreview}
                  </p>
                </div>

                {/* Indicators */}
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  {email.hasAttachments && (
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {email.flag?.flagStatus === "flagged" && (
                    <Flag className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>
              </button>
            );
          })}

          {filteredEmails.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No emails match your search" : "No emails in this folder"}
              </p>
            </div>
          )}
        </div>
        )}
      </ScrollArea>
    </div>
  );
}
