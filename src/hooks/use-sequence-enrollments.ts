import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { 
  SequenceEnrollment, 
  SequenceEnrollmentInsert, 
  SequenceEnrollmentUpdate,
  EnrollmentStatus
} from "@/types/email-automation";

interface EnrollmentWithSequence {
  id: string;
  sequence_id: string;
  contact_type: string;
  contact_id: string;
  contact_email: string;
  current_step: number;
  status: EnrollmentStatus;
  enrolled_at: string;
  next_send_at: string | null;
  completed_at: string | null;
  enrolled_by: string;
  sequence?: { name: string } | null;
}

function mapEnrollment(enrollment: EnrollmentWithSequence): SequenceEnrollment {
  return {
    id: enrollment.id,
    sequence_id: enrollment.sequence_id,
    contact_type: enrollment.contact_type,
    contact_id: enrollment.contact_id,
    contact_email: enrollment.contact_email,
    current_step: enrollment.current_step,
    status: enrollment.status,
    enrolled_at: enrollment.enrolled_at,
    next_send_at: enrollment.next_send_at,
    completed_at: enrollment.completed_at,
    enrolled_by: enrollment.enrolled_by,
    // Only include sequence name, not the full object
    contact_name: undefined,
  };
}

export function useSequenceEnrollments(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ["sequence-enrollments", sequenceId],
    enabled: !!sequenceId,
    queryFn: async (): Promise<SequenceEnrollment[]> => {
      if (!sequenceId) return [];

      const { data, error } = await supabase
        .from("sequence_enrollments")
        .select("*")
        .eq("sequence_id", sequenceId)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;
      return (data || []) as SequenceEnrollment[];
    },
  });
}

export function useAllEnrollments(filters?: { status?: EnrollmentStatus }) {
  return useQuery({
    queryKey: ["all-enrollments", filters],
    queryFn: async (): Promise<SequenceEnrollment[]> => {
      let query = supabase
        .from("sequence_enrollments")
        .select("*")
        .order("enrolled_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SequenceEnrollment[];
    },
  });
}

export function useEnrollContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (enrollment: SequenceEnrollmentInsert): Promise<SequenceEnrollment> => {
      // Calculate next_send_at based on sequence steps
      const { data: steps } = await supabase
        .from("sequence_steps")
        .select("delay_days, delay_hours")
        .eq("sequence_id", enrollment.sequence_id)
        .eq("step_order", 1)
        .single();

      let nextSendAt = new Date();
      if (steps) {
        nextSendAt.setDate(nextSendAt.getDate() + (steps.delay_days || 0));
        nextSendAt.setHours(nextSendAt.getHours() + (steps.delay_hours || 0));
      }

      const { data, error } = await supabase
        .from("sequence_enrollments")
        .insert({
          ...enrollment,
          next_send_at: nextSendAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as SequenceEnrollment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sequence-enrollments", data.sequence_id] });
      queryClient.invalidateQueries({ queryKey: ["all-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["email-sequences"] });
      toast({
        title: "Contact enrolled",
        description: "Contact has been enrolled in the sequence.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error enrolling contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useBulkEnrollContacts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      sequenceId, 
      contacts,
      enrolledBy
    }: { 
      sequenceId: string;
      contacts: Array<{ contact_type: string; contact_id: string; contact_email: string }>;
      enrolledBy: string;
    }): Promise<SequenceEnrollment[]> => {
      // Calculate next_send_at based on first step
      const { data: steps } = await supabase
        .from("sequence_steps")
        .select("delay_days, delay_hours")
        .eq("sequence_id", sequenceId)
        .eq("step_order", 1)
        .single();

      let nextSendAt = new Date();
      if (steps) {
        nextSendAt.setDate(nextSendAt.getDate() + (steps.delay_days || 0));
        nextSendAt.setHours(nextSendAt.getHours() + (steps.delay_hours || 0));
      }

      const enrollments = contacts.map(contact => ({
        sequence_id: sequenceId,
        contact_type: contact.contact_type,
        contact_id: contact.contact_id,
        contact_email: contact.contact_email,
        enrolled_by: enrolledBy,
        next_send_at: nextSendAt.toISOString(),
      }));

      const { data, error } = await supabase
        .from("sequence_enrollments")
        .insert(enrollments)
        .select();

      if (error) throw error;
      return (data || []) as SequenceEnrollment[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["sequence-enrollments", data[0].sequence_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["all-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["email-sequences"] });
      toast({
        title: "Contacts enrolled",
        description: `${data.length} contacts have been enrolled in the sequence.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error enrolling contacts",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateEnrollment() {
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
      updates: SequenceEnrollmentUpdate 
    }): Promise<SequenceEnrollment> => {
      const { data, error } = await supabase
        .from("sequence_enrollments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as SequenceEnrollment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sequence-enrollments", variables.sequenceId] });
      queryClient.invalidateQueries({ queryKey: ["all-enrollments"] });
      toast({
        title: "Enrollment updated",
        description: "Enrollment has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating enrollment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePauseEnrollment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, sequenceId }: { id: string; sequenceId: string }): Promise<void> => {
      const { error } = await supabase
        .from("sequence_enrollments")
        .update({ status: 'paused' })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sequence-enrollments", variables.sequenceId] });
      queryClient.invalidateQueries({ queryKey: ["all-enrollments"] });
      toast({
        title: "Enrollment paused",
        description: "Sequence enrollment has been paused.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error pausing enrollment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useResumeEnrollment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, sequenceId }: { id: string; sequenceId: string }): Promise<void> => {
      const { error } = await supabase
        .from("sequence_enrollments")
        .update({ status: 'active' })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sequence-enrollments", variables.sequenceId] });
      queryClient.invalidateQueries({ queryKey: ["all-enrollments"] });
      toast({
        title: "Enrollment resumed",
        description: "Sequence enrollment has been resumed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error resuming enrollment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRemoveEnrollment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, sequenceId }: { id: string; sequenceId: string }): Promise<void> => {
      const { error } = await supabase
        .from("sequence_enrollments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sequence-enrollments", variables.sequenceId] });
      queryClient.invalidateQueries({ queryKey: ["all-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["email-sequences"] });
      toast({
        title: "Enrollment removed",
        description: "Contact has been removed from the sequence.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error removing enrollment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
