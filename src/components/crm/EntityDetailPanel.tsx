import { useState, useRef } from "react";
import { X, MoreHorizontal, Edit, Trash2, CheckSquare, FileText, Paperclip, MessageCircle, Ticket, Receipt, File } from "lucide-react";
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
import { FilesList } from "@/components/crm/FilesList";
import { TicketsList } from "@/components/crm/TicketsList";
import { InvoicesList } from "@/components/crm/InvoicesList";
import { DocumentsList } from "@/components/crm/DocumentsList";
import { CommunicationTabs } from "@/components/crm/CommunicationTabs";
import { TaskDialog } from "@/components/crm/TaskDialog";
import { NoteDialog } from "@/components/crm/NoteDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/hooks/use-tasks";
import { useNotes } from "@/hooks/use-notes";
import { useEntityFiles } from "@/hooks/use-entity-files";
import { useToast } from "@/hooks/use-toast";
import { isInvoiceCapableEntity } from "@/types/documents";
import type { TaskInsert, TaskUpdate, NoteInsert, NoteUpdate, EntityTable } from "@/types/activities";

// Base entity interface for the detail panel - status fields are optional for People
interface DetailPanelEntity {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  status?: string;
  source?: string | null;
}

interface EntityDetailPanelProps {
  entity: DetailPanelEntity;
  entityType: EntityTable;
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
  const { user } = useAuth();
  const { createTask } = useTasks();
  const { createNote } = useNotes();
  const { uploadFile } = useEntityFiles();
  const { toast } = useToast();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Check if this entity type supports invoices
  const showInvoicesTab = isInvoiceCapableEntity(entityType);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;

    try {
      for (const file of Array.from(selectedFiles)) {
        await uploadFile(entityType, entity.id, file, user.id);
      }
      toast({ title: 'File(s) uploaded successfully' });
    } catch (error) {
      toast({
        title: 'Failed to upload file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveTask = async (data: TaskInsert | TaskUpdate, isEdit: boolean) => {
    if (!isEdit) {
      await createTask(data as TaskInsert);
    }
  };

  const handleSaveNote = async (data: NoteInsert | NoteUpdate, isEdit: boolean) => {
    if (!isEdit) {
      await createNote(data as NoteInsert);
    }
  };

  const initials = entity.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-full bg-background flex flex-col h-full">
      {/* Hidden file input for Add File button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
      />
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
            value="messages"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
            Messages
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
          <TabsTrigger
            value="tickets"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            <Ticket className="h-3.5 w-3.5 mr-1.5" />
            Tickets
          </TabsTrigger>
          {showInvoicesTab && (
            <TabsTrigger
              value="invoices"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              Invoices
            </TabsTrigger>
          )}
          <TabsTrigger
            value="documents"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
          >
            <File className="h-3.5 w-3.5 mr-1.5" />
            Documents
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
              
              {/* Quick action buttons */}
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">Quick actions</p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowTaskDialog(true)}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowNoteDialog(true)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Add File
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="messages" className="m-0 h-full">
            <CommunicationTabs personId={entity.id} />
          </TabsContent>
          <TabsContent value="tasks" className="m-0">
            <TasksList entityTable={entityType} entityId={entity.id} />
          </TabsContent>
          <TabsContent value="notes" className="m-0">
            <NotesList entityTable={entityType} entityId={entity.id} />
          </TabsContent>
          <TabsContent value="files" className="m-0">
            <FilesList entityTable={entityType} entityId={entity.id} />
          </TabsContent>
          <TabsContent value="tickets" className="m-0 h-full">
            <TicketsList entityTable={entityType} entityId={entity.id} />
          </TabsContent>
          {showInvoicesTab && (
            <TabsContent value="invoices" className="m-0 h-full">
              <InvoicesList entityTable={entityType} entityId={entity.id} />
            </TabsContent>
          )}
          <TabsContent value="documents" className="m-0 h-full">
            <DocumentsList entityTable={entityType} entityId={entity.id} />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Dialogs */}
      <TaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        entityTable={entityType}
        entityId={entity.id}
        userId={user?.id || ''}
        onSave={handleSaveTask}
      />
      <NoteDialog
        open={showNoteDialog}
        onOpenChange={setShowNoteDialog}
        entityTable={entityType}
        entityId={entity.id}
        userId={user?.id || ''}
        onSave={handleSaveNote}
      />
    </div>
  );
}