-- Create ticket priority enum
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create ticket status enum
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');

-- Create sequence for ticket numbers starting at 1000
CREATE SEQUENCE ticket_number_seq START 1000;

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  entity_table TEXT NOT NULL,
  entity_id UUID NOT NULL,
  ticket_type TEXT NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  assigned_to UUID,
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create function to auto-generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for auto-generating ticket numbers
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

-- Create trigger for updating updated_at
CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_tickets_entity ON tickets(entity_table, entity_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX idx_tickets_created_by ON tickets(created_by);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_due_date ON tickets(due_date);

-- Enable Row Level Security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view tickets they created, are assigned to, or if admin
CREATE POLICY "Users can view relevant tickets"
  ON tickets FOR SELECT
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- RLS Policy: Users can create tickets
CREATE POLICY "Users can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS Policy: Users can update own or assigned tickets
CREATE POLICY "Users can update own or assigned tickets"
  ON tickets FOR UPDATE
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- RLS Policy: Users can delete own tickets or admins
CREATE POLICY "Users can delete own tickets"
  ON tickets FOR DELETE
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );