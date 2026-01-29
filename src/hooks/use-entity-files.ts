import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { EntityTable } from '@/types/activities';

export interface EntityFile {
  id: string;
  entity_table: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
}

export function useEntityFiles() {
  const [loading, setLoading] = useState(false);

  const listFilesByEntity = useCallback(async (
    entityTable: EntityTable,
    entityId: string
  ): Promise<EntityFile[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entity_files')
        .select('*')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as EntityFile[];
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFile = useCallback(async (
    entityTable: EntityTable,
    entityId: string,
    file: File,
    userId: string
  ): Promise<EntityFile> => {
    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const filePath = `${entityTable}/${entityId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('entity-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create database record
    const { data, error } = await supabase
      .from('entity_files')
      .insert({
        entity_table: entityTable,
        entity_id: entityId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) {
      // Rollback storage upload on db error
      await supabase.storage.from('entity-files').remove([filePath]);
      throw error;
    }

    return data as EntityFile;
  }, []);

  const deleteFile = useCallback(async (file: EntityFile): Promise<void> => {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('entity-files')
      .remove([file.file_path]);

    if (storageError) throw storageError;

    // Delete database record
    const { error } = await supabase
      .from('entity_files')
      .delete()
      .eq('id', file.id);

    if (error) throw error;
  }, []);

  const getFileUrl = useCallback(async (filePath: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('entity-files')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) throw error;
    return data.signedUrl;
  }, []);

  return {
    loading,
    listFilesByEntity,
    uploadFile,
    deleteFile,
    getFileUrl,
  };
}
