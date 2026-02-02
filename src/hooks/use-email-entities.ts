import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Affiliate, VigilePartner, BraxDistributor, ProductSupplier } from "@/types/entities";

interface LinkedEntities {
  affiliates: Affiliate[];
  vigilePartners: VigilePartner[];
  braxDistributors: BraxDistributor[];
  productSuppliers: ProductSupplier[];
}

export function useEmailLinkedEntities(microsoftMessageId: string | null) {
  return useQuery({
    queryKey: ["email-linked-entities", microsoftMessageId],
    queryFn: async (): Promise<LinkedEntities> => {
      if (!microsoftMessageId) {
        return { affiliates: [], vigilePartners: [], braxDistributors: [], productSuppliers: [] };
      }

      // First, get the email record by Microsoft message ID
      const { data: emailRecord, error: emailError } = await supabase
        .from("email_messages")
        .select("id")
        .eq("microsoft_message_id", microsoftMessageId)
        .maybeSingle();

      if (emailError || !emailRecord) {
        return { affiliates: [], vigilePartners: [], braxDistributors: [], productSuppliers: [] };
      }

      const emailId = emailRecord.id;

      // Fetch all linked entities in parallel
      const [affiliatesResult, vigilePartnersResult, braxDistributorsResult, productSuppliersResult] = await Promise.all([
        supabase
          .from("email_affiliates")
          .select("affiliate_id, affiliates(*)")
          .eq("email_id", emailId),
        supabase
          .from("email_vigile_partners")
          .select("vigile_partner_id, vigile_partners(*)")
          .eq("email_id", emailId),
        supabase
          .from("email_brax_distributors")
          .select("brax_distributor_id, brax_distributors(*)")
          .eq("email_id", emailId),
        supabase
          .from("email_product_suppliers")
          .select("product_supplier_id, product_suppliers(*)")
          .eq("email_id", emailId),
      ]);

      const affiliates = (affiliatesResult.data || [])
        .map((r) => r.affiliates)
        .filter(Boolean) as Affiliate[];
      
      const vigilePartners = (vigilePartnersResult.data || [])
        .map((r) => r.vigile_partners)
        .filter(Boolean) as VigilePartner[];
      
      const braxDistributors = (braxDistributorsResult.data || [])
        .map((r) => r.brax_distributors)
        .filter(Boolean) as BraxDistributor[];
      
      const productSuppliers = (productSuppliersResult.data || [])
        .map((r) => r.product_suppliers)
        .filter(Boolean) as ProductSupplier[];

      return { affiliates, vigilePartners, braxDistributors, productSuppliers };
    },
    enabled: !!microsoftMessageId,
  });
}
