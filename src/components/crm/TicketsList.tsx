import { useState } from 'react';
import { Plus, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTicketsByEntity } from '@/hooks/use-tickets';
import { TicketDialog } from '@/components/tickets/TicketDialog';
import type { TicketWithDetails } from '@/types/tickets';
import { ticketStatusLabels, ticketStatusColors, ticketPriorityColors, ticketPriorityLabels } from '@/types/tickets';
import { formatDistanceToNow } from 'date-fns';

interface TicketsListProps {
  entityTable: string;
  entityId: string;
}

export function TicketsList({ entityTable, entityId }: TicketsListProps) {
  const { data: tickets = [], isLoading } = useTicketsByEntity(entityTable, entityId);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        Loading tickets...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h4 className="font-medium">Tickets ({tickets.length})</h4>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Ticket
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Ticket className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No tickets yet</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="mt-2"
            >
              Create the first ticket
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedTicket(ticket)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {ticket.ticket_number}
                    </span>
                    <Badge className={cn('text-xs', ticketStatusColors[ticket.status])}>
                      {ticketStatusLabels[ticket.status]}
                    </Badge>
                  </div>
                  <Badge className={cn('text-xs', ticketPriorityColors[ticket.priority])}>
                    {ticketPriorityLabels[ticket.priority]}
                  </Badge>
                </div>
                <h5 className="font-medium text-sm mb-1">{ticket.title}</h5>
                <p className="text-xs text-muted-foreground mb-2">{ticket.ticket_type}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Dialogs */}
      <TicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        defaultEntityTable={entityTable}
        defaultEntityId={entityId}
      />

      <TicketDialog
        open={!!selectedTicket}
        onOpenChange={(open) => !open && setSelectedTicket(null)}
        ticket={selectedTicket}
        defaultEntityTable={entityTable}
        defaultEntityId={entityId}
      />
    </div>
  );
}
