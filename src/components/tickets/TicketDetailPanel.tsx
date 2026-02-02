import { format, formatDistanceToNow } from 'date-fns';
import { X, Edit, Trash2, Calendar, User, Building2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useDeleteTicket } from '@/hooks/use-tickets';
import type { TicketWithDetails } from '@/types/tickets';
import {
  ticketStatusLabels,
  ticketStatusColors,
  ticketPriorityLabels,
  ticketPriorityColors,
} from '@/types/tickets';
import { entityTableLabels } from '@/types/activities';

interface TicketDetailPanelProps {
  ticket: TicketWithDetails;
  onClose: () => void;
  onEdit: () => void;
}

export function TicketDetailPanel({ ticket, onClose, onEdit }: TicketDetailPanelProps) {
  const deleteTicket = useDeleteTicket();

  const entityLabel =
    entityTableLabels[ticket.entity_table as keyof typeof entityTableLabels] ||
    ticket.entity_table;

  async function handleDelete() {
    await deleteTicket.mutateAsync(ticket.id);
    onClose();
  }

  return (
    <div className="w-full h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">
            {ticket.ticket_number}
          </span>
          <Badge className={cn('text-xs', ticketStatusColors[ticket.status])}>
            {ticketStatusLabels[ticket.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete ticket{' '}
                  {ticket.ticket_number}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-xl font-semibold">{ticket.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Priority and Type */}
          <div className="flex items-center gap-2">
            <Badge className={cn(ticketPriorityColors[ticket.priority])}>
              {ticketPriorityLabels[ticket.priority]} Priority
            </Badge>
            <Badge variant="outline">{ticket.ticket_type}</Badge>
          </div>

          <Separator />

          {/* Entity Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Entity:</span>
              <Badge variant="secondary">{entityLabel}</Badge>
              {ticket.entity_name && (
                <span className="font-medium">{ticket.entity_name}</span>
              )}
            </div>

            {ticket.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Due:</span>
                <span>{format(new Date(ticket.due_date), 'PPP')}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Assigned to:</span>
              <span>
                {ticket.assigned_user?.display_name ||
                  ticket.assigned_user?.email ||
                  'Unassigned'}
              </span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {ticket.description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          )}

          {/* Resolution Notes */}
          {ticket.resolution_notes && (
            <div>
              <h4 className="text-sm font-medium mb-2">Resolution Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {ticket.resolution_notes}
              </p>
              {ticket.resolved_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  Resolved {formatDistanceToNow(new Date(ticket.resolved_at), { addSuffix: true })}
                </p>
              )}
            </div>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Created: {format(new Date(ticket.created_at), 'PPp')}</p>
            <p>Updated: {format(new Date(ticket.updated_at), 'PPp')}</p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
