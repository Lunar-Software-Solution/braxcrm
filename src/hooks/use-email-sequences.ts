import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { 
  EmailSequence, 
  EmailSequenceInsert, 
  EmailSequenceUpdate,
  SequenceStep,
  SequenceStepInsert,
  SequenceStepUpdate,
  MergeField
} from "@/types/email-automation";

export function useEmailSequences() {
  return useQuery({
    queryKey: ["email-sequences"],
    queryFn: async (): Promise<EmailSequence[]> => {
      const { data: sequences, error } = await supabase
        .from("email_sequences")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get enrollment counts for each sequence
      const { data: enrollments } = await supabase
        .from("sequence_enrollments")
        .select("sequence_id")
        .in("status", ["active", "paused"]);

      const enrollmentCounts = (enrollments || []).reduce((acc, e) => {
        acc[e.sequence_id] = (acc[e.sequence_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return (sequences || []).map(seq => ({
        ...seq,
        enrollment_count: enrollmentCounts[seq.id] || 0,
      }));
    },
  });
}

export function useEmailSequence(id: string | undefined) {
  return useQuery({
    queryKey: ["email-sequence", id],
    enabled: !!id,
    queryFn: async (): Promise<EmailSequence | null> => {
      if (!id) return null;

      const { data: sequence, error: seqError } = await supabase
        .from("email_sequences")
        .select("*")
        .eq("id", id)
        .single();

      if (seqError) throw seqError;

      // Get steps with templates
      const { data: steps, error: stepsError } = await supabase
        .from("sequence_steps")
        .select(`
          *,
          template:email_templates(*)
        `)
        .eq("sequence_id", id)
        .order("step_order", { ascending: true });

      if (stepsError) throw stepsError;

      // Get enrollment count
      const { count } = await supabase
        .from("sequence_enrollments")
        .select("*", { count: "exact", head: true })
        .eq("sequence_id", id)
        .in("status", ["active", "paused"]);

      return {
        ...sequence,
        steps: (steps || []).map(step => ({
          ...step,
          template: step.template ? {
            ...step.template,
            merge_fields: (step.template.merge_fields as unknown as MergeField[]) || [],
          } : undefined,
        })) as SequenceStep[],
        enrollment_count: count || 0,
      };
    },
  });
}

export function useCreateEmailSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sequence: EmailSequenceInsert): Promise<EmailSequence> => {
      const { data, error } = await supabase
        .from("email_sequences")
        .insert(sequence)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-sequences"] });
      toast({
        title: "Sequence created",
        description: "Email sequence has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating sequence",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateEmailSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: EmailSequenceUpdate 
    }): Promise<EmailSequence> => {
      const { data, error } = await supabase
        .from("email_sequences")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-sequences"] });
      queryClient.invalidateQueries({ queryKey: ["email-sequence", variables.id] });
      toast({
        title: "Sequence updated",
        description: "Email sequence has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating sequence",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteEmailSequence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from("email_sequences")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-sequences"] });
      toast({
        title: "Sequence deleted",
        description: "Email sequence has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting sequence",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Sequence Steps
export function useCreateSequenceStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (step: SequenceStepInsert): Promise<SequenceStep> => {
      const { data, error } = await supabase
        .from("sequence_steps")
        .insert(step)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["email-sequence", data.sequence_id] });
      toast({
        title: "Step added",
        description: "Sequence step has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error adding step",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateSequenceStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      sequenceId,
      updates 
    }: { 
      id: string;
      sequenceId: string;
      updates: SequenceStepUpdate 
    }): Promise<SequenceStep> => {
      const { data, error } = await supabase
        .from("sequence_steps")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-sequence", variables.sequenceId] });
      toast({
        title: "Step updated",
        description: "Sequence step has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating step",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteSequenceStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, sequenceId }: { id: string; sequenceId: string }): Promise<void> => {
      const { error } = await supabase
        .from("sequence_steps")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["email-sequence", variables.sequenceId] });
      toast({
        title: "Step deleted",
        description: "Sequence step has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting step",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
