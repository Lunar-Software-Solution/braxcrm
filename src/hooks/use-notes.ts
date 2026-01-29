import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Note, NoteInsert, NoteUpdate, EntityTable } from '@/types/activities';

export function useNotes() {
  const [loading, setLoading] = useState(false);

  const listNotesByEntity = useCallback(async (
    entityTable: EntityTable,
    entityId: string
  ): Promise<Note[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Note[];
    } finally {
      setLoading(false);
    }
  }, []);

  const createNote = useCallback(async (note: NoteInsert): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .insert(note)
      .select()
      .single();

    if (error) throw error;
    return data as Note;
  }, []);

  const updateNote = useCallback(async (
    noteId: string,
    updates: NoteUpdate
  ): Promise<Note> => {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data as Note;
  }, []);

  const deleteNote = useCallback(async (noteId: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  }, []);

  return {
    loading,
    listNotesByEntity,
    createNote,
    updateNote,
    deleteNote,
  };
}
