import { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NoteCard } from './NoteCard';
import { NoteDialog } from './NoteDialog';
import { useNotes } from '@/hooks/use-notes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Note, NoteInsert, NoteUpdate, EntityTable } from '@/types/activities';

interface NotesListProps {
  entityTable: EntityTable;
  entityId: string;
}

export function NotesList({ entityTable, entityId }: NotesListProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const { listNotesByEntity, createNote, updateNote, deleteNote } = useNotes();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await listNotesByEntity(entityTable, entityId);
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [entityTable, entityId]);

  const handleSave = async (data: NoteInsert | NoteUpdate, isEdit: boolean) => {
    try {
      if (isEdit && editingNote) {
        await updateNote(editingNote.id, data as NoteUpdate);
        toast({ title: 'Note updated' });
      } else {
        await createNote(data as NoteInsert);
        toast({ title: 'Note added' });
      }
      loadNotes();
    } catch (error) {
      toast({
        title: isEdit ? 'Failed to update note' : 'Failed to add note',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setDialogOpen(true);
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      toast({ title: 'Note deleted' });
      loadNotes();
    } catch (error) {
      toast({
        title: 'Failed to delete note',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = () => {
    setEditingNote(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading notes...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
          <Button size="sm" onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No notes yet</p>
            <Button size="sm" variant="outline" onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Add first note
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canEdit={note.created_by === user?.id}
              />
            ))}
          </div>
        )}
      </div>

      <NoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        note={editingNote}
        onSave={handleSave}
        entityTable={entityTable}
        entityId={entityId}
        userId={user?.id || ''}
      />
    </>
  );
}
