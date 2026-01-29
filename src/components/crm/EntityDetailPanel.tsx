import { X, MoreHorizontal, Edit, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { NotesList } from "@/components/crm/NotesList";
import { TasksList } from "@/components/crm/TasksList";
import type { Entity, EntityType } from "@/types/entities";

interface EntityDetailPanelProps {
  entity: Entity;
  entityType: EntityType;
  entityColor: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function EntityDetailPanel({
  entity,
  entityType,
  entityColor,
  onClose,
  onEdit,
  onDelete,
}: EntityDetailPanelProps) {
  const initials = entity.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-full bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={entity.avatar_url || undefined} alt={entity.name} />
            <AvatarFallback style={{ backgroundColor: entityColor }} className="text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{entity.name}</h3>
            {entity.email && (
              <p className="text-sm text-muted-foreground">{entity.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Created time */}
      <div className="px-4 py-2 text-sm text-muted-foreground border-b">
        Created {formatDistanceToNow(new Date(entity.created_at), { addSuffix: true })}
      </div>

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
            <div className="space-y-4">
              {entity.phone && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Phone</p>
                  <p className="text-sm">{entity.phone}</p>
                </div>
              )}
              {entity.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{entity.notes}</p>
                </div>
              )}
              {!entity.phone && !entity.notes && (
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
            </div>
          </TabsContent>
          <TabsContent value="tasks" className="m-0 p-4">
            <TasksList entityTable={entityType} entityId={entity.id} />
          </TabsContent>
          <TabsContent value="notes" className="m-0 p-4">
            <NotesList entityTable={entityType} entityId={entity.id} />
          </TabsContent>
          <TabsContent value="files" className="m-0 p-4">
            <p className="text-sm text-muted-foreground">No files yet</p>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}