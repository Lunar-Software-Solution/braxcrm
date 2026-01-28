import { X, Mail, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  createdAt?: string;
  children?: React.ReactNode;
  isResizable?: boolean;
}

export function DetailPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  avatarUrl,
  createdAt,
  children,
  isResizable = false,
}: DetailPanelProps) {
  if (!isOpen) return null;

  const initials = title
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`${isResizable ? "w-full" : "w-[400px] border-l"} bg-background flex flex-col h-full`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} alt={title} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Created time */}
      {createdAt && (
        <div className="px-4 py-2 text-sm text-muted-foreground border-b">
          Created {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="home" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger
            value="home"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Home
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Notes
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            Files
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="home" className="m-0 p-4">
            {children || (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <h4 className="font-medium mb-1">Empty Inbox</h4>
                <p className="text-sm text-muted-foreground">
                  No activity to show yet
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="tasks" className="m-0 p-4">
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          </TabsContent>
          <TabsContent value="notes" className="m-0 p-4">
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </TabsContent>
          <TabsContent value="files" className="m-0 p-4">
            <p className="text-sm text-muted-foreground">No files yet</p>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
