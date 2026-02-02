import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import type { 
  ExtractedDocument, 
  UpdateExtractedDocumentInput, 
  DocumentType, 
  DocumentStatus 
} from "@/types/documents";

// Fetch documents for a specific entity
export function useEntityDocuments(entityTable: string, entityId: string) {
  return useQuery({
    queryKey: ["extracted-documents", "entity", entityTable, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extracted_documents")
        .select("*")
        .eq("entity_table", entityTable)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ExtractedDocument[];
    },
    enabled: !!entityTable && !!entityId,
  });
}

// Fetch all documents (global view)
export function useAllDocuments(filters?: { 
  entityTable?: string; 
  documentType?: DocumentType;
  status?: DocumentStatus;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["extracted-documents", "all", filters],
    queryFn: async () => {
      let query = supabase
        .from("extracted_documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (filters?.entityTable) {
        query = query.eq("entity_table", filters.entityTable);
      }
      if (filters?.documentType) {
        query = query.eq("document_type", filters.documentType);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ExtractedDocument[];
    },
  });
}

// Update a document
export function useUpdateDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateExtractedDocumentInput) => {
      const { id, title, status, extracted_data } = input;
      // Build update object with proper types
      const dbUpdates: Record<string, unknown> = {};
      if (title !== undefined) dbUpdates.title = title;
      if (status !== undefined) dbUpdates.status = status;
      if (extracted_data !== undefined) dbUpdates.extracted_data = extracted_data as Json;
      
      const { data, error } = await supabase
        .from("extracted_documents")
        .update(dbUpdates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ExtractedDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-documents"] });
      toast({
        title: "Document updated",
        description: "The document has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Approve a document
export function useApproveDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("extracted_documents")
        .update({ 
          status: "approved" as DocumentStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .select()
        .single();
      
      if (error) throw error;
      return data as ExtractedDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-documents"] });
      toast({
        title: "Document approved",
        description: "The document has been approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Reject a document
export function useRejectDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("extracted_documents")
        .update({ 
          status: "rejected" as DocumentStatus,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .select()
        .single();
      
      if (error) throw error;
      return data as ExtractedDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-documents"] });
      toast({
        title: "Document rejected",
        description: "The document has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete a document
export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("extracted_documents")
        .delete()
        .eq("id", documentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-documents"] });
      toast({
        title: "Document deleted",
        description: "The document has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete document",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Trigger document extraction for a file
export function useExtractDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      fileId, 
      entityTable, 
      entityId,
      documentType,
    }: { 
      fileId: string; 
      entityTable?: string;
      entityId?: string;
      documentType?: DocumentType;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            file_id: fileId,
            entity_table: entityTable,
            entity_id: entityId,
            document_type: documentType,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract document");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-documents"] });
      toast({
        title: "Document extracted",
        description: "Document data has been extracted from the file.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Extraction failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
