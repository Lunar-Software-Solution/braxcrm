import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Opportunity, OpportunityInsert, OpportunityUpdate, EntityTable, OpportunityStage } from '@/types/activities';

export function useOpportunities() {
  const [loading, setLoading] = useState(false);

  const listOpportunitiesByEntity = useCallback(async (
    entityTable: EntityTable,
    entityId: string
  ): Promise<Opportunity[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('entity_table', entityTable)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Opportunity[];
    } finally {
      setLoading(false);
    }
  }, []);

  const listAllOpportunities = useCallback(async (
    filters?: { stage?: OpportunityStage }
  ): Promise<Opportunity[]> => {
    setLoading(true);
    try {
      let query = supabase
        .from('opportunities')
        .select('*')
        .order('expected_close_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (filters?.stage) {
        query = query.eq('stage', filters.stage);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Opportunity[];
    } finally {
      setLoading(false);
    }
  }, []);

  const createOpportunity = useCallback(async (opportunity: OpportunityInsert): Promise<Opportunity> => {
    const { data, error } = await supabase
      .from('opportunities')
      .insert(opportunity)
      .select()
      .single();

    if (error) throw error;
    return data as Opportunity;
  }, []);

  const updateOpportunity = useCallback(async (
    opportunityId: string,
    updates: OpportunityUpdate
  ): Promise<Opportunity> => {
    // Auto-set closed_at when stage changes to won or lost
    const finalUpdates = { ...updates };
    if ((updates.stage === 'won' || updates.stage === 'lost') && !updates.closed_at) {
      finalUpdates.closed_at = new Date().toISOString();
    } else if (updates.stage && updates.stage !== 'won' && updates.stage !== 'lost') {
      finalUpdates.closed_at = null;
    }

    const { data, error } = await supabase
      .from('opportunities')
      .update(finalUpdates)
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) throw error;
    return data as Opportunity;
  }, []);

  const deleteOpportunity = useCallback(async (opportunityId: string): Promise<void> => {
    const { error } = await supabase
      .from('opportunities')
      .delete()
      .eq('id', opportunityId);

    if (error) throw error;
  }, []);

  return {
    loading,
    listOpportunitiesByEntity,
    listAllOpportunities,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
  };
}
