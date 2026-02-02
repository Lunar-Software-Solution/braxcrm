-- Update entity_roles table references
UPDATE public.entity_roles SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.entity_roles SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';
UPDATE public.entity_roles SET name = 'Affiliates', slug = 'affiliates' WHERE slug = 'influencers';
UPDATE public.entity_roles SET name = 'Services Suppliers', slug = 'services_suppliers' WHERE slug = 'expense_suppliers';

-- Update entity_fields references
UPDATE public.entity_fields SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.entity_fields SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update entity_field_values references
UPDATE public.entity_field_values SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.entity_field_values SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update entity_files references
UPDATE public.entity_files SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.entity_files SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update notes references
UPDATE public.notes SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.notes SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update opportunities references
UPDATE public.opportunities SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.opportunities SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update tasks references
UPDATE public.tasks SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.tasks SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update chat_conversations references
UPDATE public.chat_conversations SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.chat_conversations SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update email_messages references
UPDATE public.email_messages SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.email_messages SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update email_sequences references
UPDATE public.email_sequences SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.email_sequences SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update email_triggers references
UPDATE public.email_triggers SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.email_triggers SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';

-- Update entity_automation_rules references
UPDATE public.entity_automation_rules SET entity_table = 'affiliates' WHERE entity_table = 'influencers';
UPDATE public.entity_automation_rules SET entity_table = 'services_suppliers' WHERE entity_table = 'expense_suppliers';