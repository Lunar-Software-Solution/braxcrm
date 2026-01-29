import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Task, TaskInsert, TaskUpdate, EntityTable, TaskStatus } from '@/types/activities';

export function useTasks() {
  const [loading, setLoading] = useState(false);

  const listTasksByEntity = useCallback(async (
    entityTable: EntityTable,
    entityId: string
  ): Promise<Task[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Task[];
    } finally {
      setLoading(false);
    }
  }, []);

  const listAllTasks = useCallback(async (
    filters?: { status?: TaskStatus; assignedToMe?: boolean; userId?: string }
  ): Promise<Task[]> => {
    setLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.assignedToMe && filters?.userId) {
        query = query.eq('assigned_to', filters.userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Task[];
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (task: TaskInsert): Promise<Task> => {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }, []);

  const updateTask = useCallback(async (
    taskId: string,
    updates: TaskUpdate
  ): Promise<Task> => {
    // Auto-set completed_at when status changes to completed
    const finalUpdates = { ...updates };
    if (updates.status === 'completed' && !updates.completed_at) {
      finalUpdates.completed_at = new Date().toISOString();
    } else if (updates.status && updates.status !== 'completed') {
      finalUpdates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(finalUpdates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data as Task;
  }, []);

  const deleteTask = useCallback(async (taskId: string): Promise<void> => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  }, []);

  return {
    loading,
    listTasksByEntity,
    listAllTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
