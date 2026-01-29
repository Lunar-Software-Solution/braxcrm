import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Influencer, Reseller, ProductSupplier } from "@/types/entities";

interface LinkedEntities {
  influencers: Influencer[];
  resellers: Reseller[];
  productSuppliers: ProductSupplier[];
}

export function useEmailLinkedEntities(microsoftMessageId: string | null) {
  return useQuery({
    queryKey: ["email-linked-entities", microsoftMessageId],
    queryFn: async (): Promise<LinkedEntities> => {
      if (!microsoftMessageId) {
        return { influencers: [], resellers: [], productSuppliers: [] };
      }

      // First, get the email record by Microsoft message ID
      const { data: emailRecord, error: emailError } = await supabase
        .from("email_messages")
        .select("id")
        .eq("microsoft_message_id", microsoftMessageId)
        .maybeSingle();

      if (emailError || !emailRecord) {
        return { influencers: [], resellers: [], productSuppliers: [] };
      }

      const emailId = emailRecord.id;

      // Fetch all linked entities in parallel
      const [influencersResult, resellersResult, productSuppliersResult] = await Promise.all([
        supabase
          .from("email_influencers")
          .select("influencer_id, influencers(*)")
          .eq("email_id", emailId),
        supabase
          .from("email_resellers")
          .select("reseller_id, resellers(*)")
          .eq("email_id", emailId),
        supabase
          .from("email_product_suppliers")
          .select("product_supplier_id, product_suppliers(*)")
          .eq("email_id", emailId),
      ]);

      const influencers = (influencersResult.data || [])
        .map((r) => r.influencers)
        .filter(Boolean) as Influencer[];
      
      const resellers = (resellersResult.data || [])
        .map((r) => r.resellers)
        .filter(Boolean) as Reseller[];
      
      const productSuppliers = (productSuppliersResult.data || [])
        .map((r) => r.product_suppliers)
        .filter(Boolean) as ProductSupplier[];

      return { influencers, resellers, productSuppliers };
    },
    enabled: !!microsoftMessageId,
  });
}
