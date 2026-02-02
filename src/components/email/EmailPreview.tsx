import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Archive,
  MoreHorizontal,
  Paperclip,
  Flag,
  Printer,
  ExternalLink,
  Mail,
  Download,
  Loader2,
  Users,
  Building2,
  Truck,
  Tag,
  RotateCcw,
  CheckCircle2,
  Clock,
  CircleDashed,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Email } from "@/types/email";
import { format } from "date-fns";
import { useEmailLinkedEntities } from "@/hooks/use-email-entities";
import { useEmailMetadata, useEmailTags, useResetEmailProcessing } from "@/hooks/use-email-metadata";

interface EmailPreviewProps {
  email: Email | null;
  onReply: (email: Email) => void;
  onReplyAll: (email: Email) => void;
  onForward: (email: Email) => void;
  onDelete: (email: Email) => void;
  onArchive: (email: Email) => void;
  isLoading?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function EmailPreview({
  email,
  onReply,
  onReplyAll,
  onForward,
  onDelete,
  onArchive,
  isLoading = false,
}: EmailPreviewProps) {
  const { data: linkedEntities, isLoading: loadingEntities } = useEmailLinkedEntities(email?.id || null);
  
  // Fetch metadata for this email
  const microsoftIds = email ? [email.id] : [];
  const { data: metadataMap = {} } = useEmailMetadata(microsoftIds);
  const metadata = email ? metadataMap[email.id] : null;
  
  // Fetch tags for this email
  const internalIds = metadata ? [metadata.id] : [];
  const { data: tagsMap = {} } = useEmailTags(internalIds);
  const tags = metadata ? tagsMap[metadata.id] || [] : [];
  
  // Reset processing mutation
  const resetProcessing = useResetEmailProcessing();
  
  const hasLinkedEntities = linkedEntities && (
    linkedEntities.affiliates.length > 0 ||
    linkedEntities.vigilePartners.length > 0 ||
    linkedEntities.braxDistributors.length > 0 ||
    linkedEntities.productSuppliers.length > 0
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading email...</p>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-muted/20">
        <Mail className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Select an email to read</p>
      </div>
    );
  }

  const senderName = email.from?.emailAddress.name || email.from?.emailAddress.address || "Unknown";
  const senderEmail = email.from?.emailAddress.address || "";

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border px-4 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onReply(email)} className="h-8 w-8">
              <Reply className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reply</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onReplyAll(email)} className="h-8 w-8">
              <ReplyAll className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reply All</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onForward(email)} className="h-8 w-8">
              <Forward className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Forward</TooltipContent>
        </Tooltip>

        <div className="mx-2 h-5 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onArchive(email)} className="h-8 w-8">
              <Archive className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Archive</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onDelete(email)} className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem>
              <Flag className="h-4 w-4 mr-2" />
              Flag message
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in new window
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Email content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Subject */}
          <div className="flex items-start gap-3 mb-6">
            <h1 className="text-xl font-semibold flex-1">{email.subject}</h1>
            {email.importance === "high" && (
              <Badge variant="destructive" className="shrink-0">
                High Priority
              </Badge>
            )}
          </div>

          {/* Category, Tags & Processing Status */}
          {metadata && (
            <div className="mb-6 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  <span>Classification & Rules</span>
                </div>
                <div className="flex items-center gap-2">
                  {metadata.is_processed ? (
                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Processed
                    </Badge>
                  ) : metadata.category_id ? (
                    <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      <Clock className="h-3 w-3" />
                      Rules Pending
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <CircleDashed className="h-3 w-3" />
                      Not Categorized
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        disabled={resetProcessing.isPending}
                        onClick={() => {
                          if (metadata.id) {
                            resetProcessing.mutate([metadata.id]);
                          }
                        }}
                      >
                        {resetProcessing.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        Reset
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Clear category and tags, re-classify on next sync
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {metadata.category && (
                  <Badge
                    variant="secondary"
                    className="gap-1.5"
                    style={{ 
                      backgroundColor: metadata.category.color ? `${metadata.category.color}20` : undefined,
                      color: metadata.category.color || undefined,
                      borderColor: metadata.category.color ? `${metadata.category.color}40` : undefined,
                    }}
                  >
                    <Tag className="h-3 w-3" />
                    {metadata.category.name}
                    {metadata.ai_confidence !== null && (
                      <span className="text-xs opacity-70">
                        ({Math.round(metadata.ai_confidence * 100)}%)
                      </span>
                    )}
                  </Badge>
                )}
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{ 
                      borderColor: tag.color || undefined,
                      color: tag.color || undefined,
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {!metadata.category && tags.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    No category or tags assigned
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sender info */}
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{senderName}</span>
                <span className="text-sm text-muted-foreground">&lt;{senderEmail}&gt;</span>
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                To: {email.toRecipients.map((r) => r.emailAddress.name || r.emailAddress.address).join(", ")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(email.receivedDateTime), "EEEE, MMMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          </div>

          {/* Linked Entities */}
          {hasLinkedEntities && (
            <div className="mb-6 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span>Linked Entities</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {linkedEntities.affiliates.map((affiliate) => (
                  <Badge
                    key={affiliate.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                  >
                    <Users className="h-3 w-3" />
                    {affiliate.name}
                    <span className="text-xs opacity-70">Affiliate</span>
                  </Badge>
                ))}
                {linkedEntities.vigilePartners.map((partner) => (
                  <Badge
                    key={partner.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  >
                    <Building2 className="h-3 w-3" />
                    {partner.name}
                    <span className="text-xs opacity-70">Vigile Partner</span>
                  </Badge>
                ))}
                {linkedEntities.braxDistributors.map((distributor) => (
                  <Badge
                    key={distributor.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                  >
                    <Building2 className="h-3 w-3" />
                    {distributor.name}
                    <span className="text-xs opacity-70">Brax Distributor</span>
                  </Badge>
                ))}
                {linkedEntities.productSuppliers.map((supplier) => (
                  <Badge
                    key={supplier.id}
                    variant="secondary"
                    className="flex items-center gap-1.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  >
                    <Truck className="h-3 w-3" />
                    {supplier.name}
                    <span className="text-xs opacity-70">Product Supplier</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {email.hasAttachments && (
            <div className="mb-6 p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Paperclip className="h-4 w-4" />
                <span>Attachments</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded bg-background border border-border hover:bg-accent transition-colors">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">Q4_Report.pdf</span>
                  <span className="text-xs text-muted-foreground">(2.4 MB)</span>
                  <Download className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                </button>
              </div>
            </div>
          )}

          {/* Email body */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {email.body ? (
              <div
                dangerouslySetInnerHTML={{ __html: email.body.content }}
                className="[&_p]:mb-4 [&_ul]:mb-4 [&_ol]:mb-4"
              />
            ) : (
              <p>{email.bodyPreview}</p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
