import { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TicketCard } from './TicketCard';
import { useUpdateTicketStatus } from '@/hooks/use-tickets';
import type { TicketWithDetails, TicketStatus } from '@/types/tickets';
import { ticketStatusLabels, ticketStatusColors, allStatuses } from '@/types/tickets';

interface TicketKanbanProps {
  tickets: TicketWithDetails[];
  onTicketClick: (ticket: TicketWithDetails) => void;
}

export function TicketKanban({ tickets, onTicketClick }: TicketKanbanProps) {
  const updateStatus = useUpdateTicketStatus();
  const [draggedTicket, setDraggedTicket] = useState<TicketWithDetails | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TicketStatus | null>(null);

  const ticketsByStatus = allStatuses.reduce((acc, status) => {
    acc[status] = tickets.filter((t) => t.status === status);
    return acc;
  }, {} as Record<TicketStatus, TicketWithDetails[]>);

  function handleDragStart(e: React.DragEvent, ticket: TicketWithDetails) {
    setDraggedTicket(ticket);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ticket.id);
  }

  function handleDragEnd() {
    setDraggedTicket(null);
    setDragOverStatus(null);
  }

  function handleDragOver(e: React.DragEvent, status: TicketStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  }

  function handleDragLeave() {
    setDragOverStatus(null);
  }

  async function handleDrop(e: React.DragEvent, status: TicketStatus) {
    e.preventDefault();
    setDragOverStatus(null);

    if (draggedTicket && draggedTicket.status !== status) {
      await updateStatus.mutateAsync({ id: draggedTicket.id, status });
    }
    setDraggedTicket(null);
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4 min-w-max">
        {allStatuses.map((status) => (
          <div
            key={status}
            className={cn(
              'flex-shrink-0 w-72 bg-muted/30 rounded-lg p-3',
              dragOverStatus === status && 'ring-2 ring-primary bg-muted/50'
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    ticketStatusColors[status]
                  )}
                >
                  {ticketStatusLabels[status]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {ticketsByStatus[status].length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[200px]">
              {ticketsByStatus[status].map((ticket) => (
                <div
                  key={ticket.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'transition-opacity',
                    draggedTicket?.id === ticket.id && 'opacity-50'
                  )}
                >
                  <TicketCard
                    ticket={ticket}
                    onClick={() => onTicketClick(ticket)}
                    isDragging={draggedTicket?.id === ticket.id}
                  />
                </div>
              ))}

              {ticketsByStatus[status].length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tickets
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
