export interface Influencer {
  id: string;
  workspace_id: string;
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
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  workspace_id: string;
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
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type EntityType = "influencers" | "resellers" | "suppliers" | "corporate_management";

export type Entity = Influencer | Reseller | Supplier | CorporateManagement;
