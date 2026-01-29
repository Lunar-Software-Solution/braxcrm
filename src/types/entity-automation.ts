import type { RuleActionType } from "./email-rules";

export interface EntityAutomationRule {
  id: string;
  entity_table: string;
  is_active: boolean;
  priority: number;
  description: string | null;
  ai_prompt: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  actions?: EntityRuleAction[];
}

export interface EntityRuleAction {
  id: string;
  entity_rule_id: string;
  action_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// Actions that require specific entity types (invoice extraction)
export const INVOICE_CAPABLE_ENTITIES = [
  "product_suppliers",
  "expense_suppliers",
  "corporate_management",
  "subscriptions",
] as const;

// Available actions per entity type
export const ENTITY_ACTION_AVAILABILITY: Record<string, RuleActionType[]> = {
  influencers: ["visibility", "tag", "mark_priority", "assign_role"],
  resellers: ["visibility", "tag", "mark_priority", "assign_role"],
  product_suppliers: ["visibility", "tag", "mark_priority", "extract_invoice", "assign_role"],
  expense_suppliers: ["visibility", "tag", "mark_priority", "extract_invoice", "assign_role"],
  corporate_management: ["visibility", "tag", "mark_priority", "extract_invoice", "assign_role"],
  personal_contacts: ["visibility", "tag"],
  subscriptions: ["visibility", "tag", "mark_priority", "extract_invoice"],
};

// Entity display config with icons and colors matching CRMSidebar
export const ENTITY_AUTOMATION_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  influencers: { icon: "Sparkles", color: "#ec4899", label: "Influencers" },
  resellers: { icon: "Store", color: "#22c55e", label: "Resellers" },
  product_suppliers: { icon: "Package", color: "#3b82f6", label: "Product Suppliers" },
  expense_suppliers: { icon: "Receipt", color: "#f97316", label: "Expense Suppliers" },
  corporate_management: { icon: "Building2", color: "#0891b2", label: "Corporate Management" },
  personal_contacts: { icon: "Contact", color: "#8b5cf6", label: "Personal Contacts" },
  subscriptions: { icon: "CreditCard", color: "#f59e0b", label: "Subscriptions" },
};

// All entity tables in order
export const ENTITY_TABLES = [
  "influencers",
  "resellers",
  "product_suppliers",
  "expense_suppliers",
  "corporate_management",
  "personal_contacts",
  "subscriptions",
] as const;

export type EntityTable = (typeof ENTITY_TABLES)[number];
