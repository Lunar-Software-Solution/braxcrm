import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { DocumentImportEvent, DocumentImportStatus } from "@/types/documents";

// Fetch document import events
export function useDocumentImports(filters?: { 
  status?: DocumentImportStatus;
  endpointId?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["document-imports", filters],
    queryFn: async () => {
      let query = supabase
        .from("document_import_events")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.endpointId) {
        query = query.eq("endpoint_id", filters.endpointId);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DocumentImportEvent[];
    },
  });
}

// Fetch a single document import event
export function useDocumentImport(importId: string) {
  return useQuery({
    queryKey: ["document-imports", importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_import_events")
        .select("*")
        .eq("id", importId)
        .single();
      
      if (error) throw error;
      return data as DocumentImportEvent;
    },
    enabled: !!importId,
  });
}

// Retry a failed import
export function useRetryDocumentImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (importId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Reset status to pending for reprocessing
      const { data, error } = await supabase
        .from("document_import_events")
        .update({ 
          status: "pending" as DocumentImportStatus,
          error_message: null,
          processed_at: null,
        })
        .eq("id", importId)
        .select()
        .single();
      
      if (error) throw error;

      // Trigger reprocessing
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-document-import`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ import_id: importId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reprocess import");
      }

      return data as DocumentImportEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-imports"] });
      toast({
        title: "Import restarted",
        description: "The document import has been queued for reprocessing.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to retry import",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete a document import event
export function useDeleteDocumentImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase
        .from("document_import_events")
        .delete()
        .eq("id", importId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-imports"] });
      toast({
        title: "Import deleted",
        description: "The document import event has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete import",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Get import statistics
export function useDocumentImportStats() {
  return useQuery({
    queryKey: ["document-imports", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_import_events")
        .select("status");
      
      if (error) throw error;

      const stats = {
        pending: 0,
        downloading: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: data.length,
      };

      data.forEach((event) => {
        if (event.status in stats) {
          stats[event.status as keyof typeof stats]++;
        }
      });

      return stats;
    },
  });
}
