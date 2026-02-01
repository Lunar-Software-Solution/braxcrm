import { formatDistanceToNow } from "date-fns";
import { MessageSquare, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatConversation } from "@/types/messaging";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/types/messaging";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  conversations: ChatConversation[];
  selectedId?: string;
  onSelect: (conversation: ChatConversation) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Loading conversations...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
        <MessageSquare className="h-8 w-8 opacity-50" />
        <p className="text-sm">No conversations yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedId === conversation.id}
            onClick={() => onSelect(conversation)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface ConversationItemProps {
  conversation: ChatConversation;
  isSelected: boolean;
  onClick: () => void;
}

function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const displayName = conversation.person?.name || 
    conversation.participant_name || 
    conversation.participant_identifier;
  
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
        "hover:bg-muted/50",
        isSelected && "bg-muted"
      )}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={conversation.person?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {conversation.person ? initials : <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{displayName}</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0"
            style={{ 
              borderColor: PLATFORM_COLORS[conversation.platform],
              color: PLATFORM_COLORS[conversation.platform],
            }}
          >
            {PLATFORM_LABELS[conversation.platform]}
          </Badge>
        </div>

        {conversation.last_message_preview && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {conversation.last_message_preview}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1">
          {conversation.last_message_at && (
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {conversation.message_count} messages
          </span>
        </div>
      </div>
    </button>
  );
}
