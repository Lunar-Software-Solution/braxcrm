import { 
  Type, 
  Hash, 
  Calendar, 
  Clock, 
  ToggleLeft, 
  DollarSign, 
  Link, 
  MapPin, 
  User 
} from "lucide-react";

export type EntityFieldType = 
  | 'text'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'currency'
  | 'link'
  | 'address'
  | 'actor';

export interface EntityField {
  id: string;
  entity_table: string;
  name: string;
  slug: string;
  data_type: EntityFieldType;
  icon: string | null;
  description: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  config: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EntityFieldValue {
  id: string;
  field_id: string;
  entity_table: string;
  entity_id: string;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface FieldTypeOption {
  value: EntityFieldType;
  label: string;
  icon: typeof Type;
  description: string;
}

export const FIELD_TYPE_OPTIONS: FieldTypeOption[] = [
  { value: 'text', label: 'Text', icon: Type, description: 'Single or multi-line text' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric values' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Date without time' },
  { value: 'datetime', label: 'Date & Time', icon: Clock, description: 'Date with time' },
  { value: 'boolean', label: 'True/False', icon: ToggleLeft, description: 'Yes or No toggle' },
  { value: 'currency', label: 'Currency', icon: DollarSign, description: 'Monetary values' },
  { value: 'link', label: 'Link', icon: Link, description: 'URL or web address' },
  { value: 'address', label: 'Address', icon: MapPin, description: 'Physical address' },
  { value: 'actor', label: 'Actor', icon: User, description: 'User reference' },
];

export const getFieldTypeOption = (type: EntityFieldType): FieldTypeOption => {
  return FIELD_TYPE_OPTIONS.find(opt => opt.value === type) || FIELD_TYPE_OPTIONS[0];
};

export const getFieldTypeIcon = (type: EntityFieldType) => {
  return getFieldTypeOption(type).icon;
};

export const getFieldTypeLabel = (type: EntityFieldType): string => {
  return getFieldTypeOption(type).label;
};

// Helper to generate slug from name
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
};

// Entity table display names
export const ENTITY_TABLE_LABELS: Record<string, string> = {
  influencers: 'Influencers',
  resellers: 'Resellers',
  suppliers: 'Suppliers',
  corporate_management: 'Corporate Management',
  personal_contacts: 'Personal Contacts',
  people: 'People',
};
