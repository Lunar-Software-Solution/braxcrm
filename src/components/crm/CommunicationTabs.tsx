import { useState } from "react";
import { MessageSquare, Mail, Phone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationList } from "@/components/crm/ConversationList";
import { ConversationThread } from "@/components/crm/ConversationThread";
import { useChatConversations } from "@/hooks/use-chat-conversations";
import type { ChatConversation, MessagingPlatform } from "@/types/messaging";
import { PLATFORM_COLORS } from "@/types/messaging";

interface CommunicationTabsProps {
  personId: string;
}

type CommunicationChannel = MessagingPlatform | "phone" | "email";

const CHANNEL_CONFIG: Record<CommunicationChannel, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: PLATFORM_COLORS.whatsapp },
  signal: { label: "Signal", icon: MessageSquare, color: PLATFORM_COLORS.signal },
  telegram: { label: "Telegram", icon: MessageSquare, color: PLATFORM_COLORS.telegram },
  wechat: { label: "WeChat", icon: MessageSquare, color: PLATFORM_COLORS.wechat },
  phone: { label: "Phone", icon: Phone, color: "#6B7280" },
  email: { label: "Emails", icon: Mail, color: "#3B82F6" },
};

const CHANNELS: CommunicationChannel[] = ["whatsapp", "signal", "telegram", "wechat", "phone", "email"];

export function CommunicationTabs({ personId }: CommunicationTabsProps) {
  const [activeChannel, setActiveChannel] = useState<CommunicationChannel>("whatsapp");
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);

  // Fetch conversations for messaging platforms
  const isMessagingPlatform = activeChannel !== "phone" && activeChannel !== "email";
  const { data: conversations = [], isLoading } = useChatConversations({
    personId,
    platform: isMessagingPlatform ? activeChannel as MessagingPlatform : undefined,
  });

  const handleSelectConversation = (conversation: ChatConversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel tabs */}
      <Tabs value={activeChannel} onValueChange={(v) => {
        setActiveChannel(v as CommunicationChannel);
        setSelectedConversation(null);
      }}>
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0 flex-wrap">
          {CHANNELS.map((channel) => {
            const config = CHANNEL_CONFIG[channel];
            const Icon = config.icon;
            return (
              <TabsTrigger
                key={channel}
                value={channel}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-current data-[state=active]:bg-transparent px-3 py-2 text-xs gap-1.5"
                style={{ 
                  borderBottomColor: activeChannel === channel ? config.color : 'transparent',
                } as React.CSSProperties}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{config.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 min-h-0">
          {/* Messaging platform content */}
          {isMessagingPlatform && (
            <TabsContent value={activeChannel} className="m-0 h-full">
              {selectedConversation ? (
                <div className="h-full flex flex-col">
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border-b flex items-center gap-1"
                  >
                    ← Back to conversations
                  </button>
                  <div className="flex-1 min-h-0">
                    <ConversationThread conversation={selectedConversation} />
                  </div>
                </div>
              ) : (
                <ConversationList
                  conversations={conversations}
                  onSelect={handleSelectConversation}
                  isLoading={isLoading}
                />
              )}
            </TabsContent>
          )}

          {/* Phone calls - placeholder */}
          <TabsContent value="phone" className="m-0 p-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Phone className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h4 className="font-medium text-sm mb-1">Phone Call Log</h4>
              <p className="text-xs text-muted-foreground">
                Phone call history will appear here
              </p>
            </div>
          </TabsContent>

          {/* Emails - placeholder */}
          <TabsContent value="email" className="m-0 p-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <h4 className="font-medium text-sm mb-1">Email History</h4>
              <p className="text-xs text-muted-foreground">
                Email conversations will appear here
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
