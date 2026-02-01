import { format } from "date-fns";
import { User, Link2, Link2Off, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatConversation, ChatMessage } from "@/types/messaging";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/types/messaging";
import { cn } from "@/lib/utils";

interface ConversationThreadProps {
  conversation: ChatConversation;
  onLinkPerson?: () => void;
  onUnlinkPerson?: () => void;
  onDelete?: () => void;
}

export function ConversationThread({
  conversation,
  onLinkPerson,
  onUnlinkPerson,
  onDelete,
}: ConversationThreadProps) {
  const displayName = conversation.person?.name || 
    conversation.participant_name || 
    conversation.participant_identifier;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.person?.avatar_url || undefined} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{displayName}</h3>
              <Badge
                variant="outline"
                className="text-xs"
                style={{ 
                  borderColor: PLATFORM_COLORS[conversation.platform],
                  color: PLATFORM_COLORS[conversation.platform],
                }}
              >
                {PLATFORM_LABELS[conversation.platform]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {conversation.participant_identifier}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {conversation.person_id ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnlinkPerson}
              className="text-muted-foreground"
            >
              <Link2Off className="h-4 w-4 mr-1" />
              Unlink
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLinkPerson}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Link to Person
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.messages.map((message, index) => (
            <MessageBubble
              key={message.id || index}
              message={message}
              participantName={displayName}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  participantName: string;
}

function MessageBubble({ message, participantName }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";

  return (
    <div
      className={cn(
        "flex",
        isOutbound ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2",
          isOutbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {!isOutbound && (
          <p className="text-xs font-medium mb-1 opacity-70">
            {participantName}
          </p>
        )}
        
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {message.media_url && (
          <a
            href={message.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-xs underline mt-1 block",
              isOutbound ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            View attachment ({message.type})
          </a>
        )}

        <p
          className={cn(
            "text-[10px] mt-1",
            isOutbound ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {format(new Date(message.sent_at), "MMM d, h:mm a")}
        </p>
      </div>
    </div>
  );
}
