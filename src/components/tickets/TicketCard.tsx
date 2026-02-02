import { format, isPast, isToday } from 'date-fns';
import { Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { TicketWithDetails } from '@/types/tickets';
import { ticketPriorityColors, ticketPriorityLabels } from '@/types/tickets';
import { entityTableLabels } from '@/types/activities';

interface TicketCardProps {
  ticket: TicketWithDetails;
  onClick: () => void;
  isDragging?: boolean;
}

export function TicketCard({ ticket, onClick, isDragging }: TicketCardProps) {
  const isOverdue = ticket.due_date && isPast(new Date(ticket.due_date)) && !isToday(new Date(ticket.due_date));
  const isDueToday = ticket.due_date && isToday(new Date(ticket.due_date));

  const entityLabel = entityTableLabels[ticket.entity_table as keyof typeof entityTableLabels] || ticket.entity_table;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow',
        isDragging && 'shadow-lg opacity-90'
      )}
    >
      {/* Header: Ticket number and priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-muted-foreground">
          {ticket.ticket_number}
        </span>
        <Badge className={cn('text-xs', ticketPriorityColors[ticket.priority])}>
          {ticketPriorityLabels[ticket.priority]}
        </Badge>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm mb-2 line-clamp-2">{ticket.title}</h4>

      {/* Entity info */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">
          {entityLabel}
        </Badge>
        {ticket.entity_name && (
          <span className="text-xs text-muted-foreground truncate">
            {ticket.entity_name}
          </span>
        )}
      </div>

      {/* Ticket type */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">{ticket.ticket_type}</span>
      </div>

      {/* Footer: Due date and assignee */}
      <div className="flex items-center justify-between text-xs">
        {ticket.due_date ? (
          <div
            className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-destructive',
              isDueToday && 'text-orange-600 dark:text-orange-400'
            )}
          >
            <Calendar className="h-3 w-3" />
            <span>
              {isOverdue ? 'Overdue: ' : isDueToday ? 'Today' : ''}
              {!isDueToday && format(new Date(ticket.due_date), 'MMM d')}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">No due date</span>
        )}

        {ticket.assigned_user ? (
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary/10">
              {ticket.assigned_user.display_name?.[0] || ticket.assigned_user.email?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <User className="h-3 w-3" />
            <span>Unassigned</span>
          </div>
        )}
      </div>
    </div>
  );
}
