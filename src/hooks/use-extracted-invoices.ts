import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ExtractedInvoice, UpdateExtractedInvoiceInput, InvoiceStatus } from "@/types/documents";

// Fetch invoices for a specific entity
export function useEntityInvoices(entityTable: string, entityId: string) {
  return useQuery({
    queryKey: ["extracted-invoices", "entity", entityTable, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extracted_invoices")
        .select("*")
        .eq("entity_table", entityTable)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ExtractedInvoice[];
    },
    enabled: !!entityTable && !!entityId,
  });
}

// Fetch all invoices (global view)
export function useAllInvoices(filters?: { 
  entityTable?: string; 
  status?: InvoiceStatus;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["extracted-invoices", "all", filters],
    queryFn: async () => {
      let query = supabase
        .from("extracted_invoices")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (filters?.entityTable) {
        query = query.eq("entity_table", filters.entityTable);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ExtractedInvoice[];
    },
  });
}

// Update an invoice
export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateExtractedInvoiceInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from("extracted_invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as ExtractedInvoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["extracted-invoices"] });
      toast({
        title: "Invoice updated",
        description: "The invoice has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Approve an invoice
export function useApproveInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from("extracted_invoices")
        .update({ status: "approved" as const })
        .eq("id", invoiceId)
        .select()
        .single();
      
      if (error) throw error;
      return data as ExtractedInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-invoices"] });
      toast({
        title: "Invoice approved",
        description: "The invoice has been approved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to approve invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Reject an invoice
export function useRejectInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .from("extracted_invoices")
        .update({ status: "rejected" as const })
        .eq("id", invoiceId)
        .select()
        .single();
      
      if (error) throw error;
      return data as ExtractedInvoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-invoices"] });
      toast({
        title: "Invoice rejected",
        description: "The invoice has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to reject invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete an invoice
export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("extracted_invoices")
        .delete()
        .eq("id", invoiceId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-invoices"] });
      toast({
        title: "Invoice deleted",
        description: "The invoice has been deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Trigger invoice extraction for an email
export function useExtractInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ emailId, entityTable, entityId }: { 
      emailId: string; 
      entityTable?: string;
      entityId?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-invoice`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            email_id: emailId,
            entity_table: entityTable,
            entity_id: entityId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract invoice");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extracted-invoices"] });
      toast({
        title: "Invoice extracted",
        description: "Invoice data has been extracted from the email.",
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
