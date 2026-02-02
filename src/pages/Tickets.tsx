import { useState } from 'react';
import { Plus, Search, Filter, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { TicketKanban } from '@/components/tickets/TicketKanban';
import { TicketDialog } from '@/components/tickets/TicketDialog';
import { TicketDetailPanel } from '@/components/tickets/TicketDetailPanel';
import { useTickets, useTicketStatusCounts } from '@/hooks/use-tickets';
import { entityTableLabels } from '@/types/activities';
import type { TicketWithDetails, TicketStatus, TicketPriority } from '@/types/tickets';
import { allPriorities, ticketPriorityLabels } from '@/types/tickets';

export default function Tickets() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const filters = {
    search: search || undefined,
    entityTable: entityFilter !== 'all' ? entityFilter : undefined,
    priority: priorityFilter !== 'all' ? [priorityFilter] : undefined,
  };

  const { data: tickets = [], isLoading } = useTickets(filters);
  const { data: statusCounts } = useTicketStatusCounts();

  const entityTableOptions = Object.entries(entityTableLabels).filter(
    ([key]) => key !== 'people'
  );

  function handleTicketClick(ticket: TicketWithDetails) {
    setSelectedTicket(ticket);
  }

  function handleEditTicket() {
    setShowEditDialog(true);
  }

  function handleClosePanel() {
    setSelectedTicket(null);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Ticket className="h-6 w-6" />
          <div>
            <h1 className="text-xl font-semibold">Tickets</h1>
            <p className="text-sm text-muted-foreground">
              {statusCounts?.total || 0} total · {(statusCounts?.open || 0) + (statusCounts?.in_progress || 0) + (statusCounts?.waiting || 0)} active
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entity Types</SelectItem>
            {entityTableOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {allPriorities.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {ticketPriorityLabels[priority]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading tickets...
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={selectedTicket ? 70 : 100} minSize={50}>
              <TicketKanban tickets={tickets} onTicketClick={handleTicketClick} />
            </ResizablePanel>

            {selectedTicket && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
                  <TicketDetailPanel
                    ticket={selectedTicket}
                    onClose={handleClosePanel}
                    onEdit={handleEditTicket}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
      </div>

      {/* Dialogs */}
      <TicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <TicketDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            // Refresh the selected ticket data
            setSelectedTicket(null);
          }
        }}
        ticket={selectedTicket}
      />
    </div>
  );
}
