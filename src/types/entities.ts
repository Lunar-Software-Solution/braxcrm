import type { EntityStatus } from "./approvals";

export interface Affiliate {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface VigilePartner {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BraxDistributor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ServicesSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CorporateManagement {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingSource {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MerchantAccount {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LogisticSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type EntityType = "affiliates" | "vigile_partners" | "brax_distributors" | "product_suppliers" | "services_suppliers" | "corporate_management" | "personal_contacts" | "subscription_suppliers" | "marketing_sources" | "merchant_accounts" | "logistic_suppliers";

export type Entity = Affiliate | VigilePartner | BraxDistributor | ProductSupplier | ServicesSupplier | CorporateManagement | PersonalContact | SubscriptionSupplier | MarketingSource | MerchantAccount | LogisticSupplier;
