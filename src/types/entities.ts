export interface Influencer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Reseller {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type EntityType = "influencers" | "resellers" | "product_suppliers" | "expense_suppliers" | "corporate_management" | "personal_contacts" | "subscriptions" | "marketing_sources";

export type Entity = Influencer | Reseller | ProductSupplier | ExpenseSupplier | CorporateManagement | PersonalContact | Subscription | MarketingSource;
