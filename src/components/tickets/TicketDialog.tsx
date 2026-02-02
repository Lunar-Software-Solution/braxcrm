import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTicket, useUpdateTicket } from '@/hooks/use-tickets';
import { useEntities } from '@/hooks/use-entities';
import { supabase } from '@/integrations/supabase/client';
import type { Ticket, TicketPriority, TicketStatus } from '@/types/tickets';
import { ticketTypesByEntity, allPriorities, ticketPriorityLabels, allStatuses, ticketStatusLabels } from '@/types/tickets';
import type { EntityTable } from '@/types/activities';
import { entityTableLabels } from '@/types/activities';
import type { EntityType, Entity } from '@/types/entities';

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  entity_table: z.string().min(1, 'Entity type is required'),
  entity_id: z.string().min(1, 'Entity is required'),
  ticket_type: z.string().min(1, 'Ticket type is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['open', 'in_progress', 'waiting', 'resolved', 'closed']).optional(),
  assigned_to: z.string().optional().nullable(),
  due_date: z.date().optional().nullable(),
  resolution_notes: z.string().optional().nullable(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket?: Ticket | null;
  defaultEntityTable?: string;
  defaultEntityId?: string;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

export function TicketDialog({
  open,
  onOpenChange,
  ticket,
  defaultEntityTable,
  defaultEntityId,
}: TicketDialogProps) {
  const { user } = useAuth();
  const createTicket = useCreateTicket();
  const updateTicket = useUpdateTicket();
  const [users, setUsers] = useState<Profile[]>([]);
  const isEditing = !!ticket;

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      entity_table: defaultEntityTable || '',
      entity_id: defaultEntityId || '',
      ticket_type: '',
      priority: 'medium',
      status: 'open',
      assigned_to: null,
      due_date: null,
      resolution_notes: null,
    },
  });

  const selectedEntityTable = form.watch('entity_table');
  const selectedStatus = form.watch('status');
  
  // Only use useEntities for valid entity types (not 'people')
  const isValidEntityType = selectedEntityTable && selectedEntityTable !== 'people';
  const entitiesHook = useEntities(isValidEntityType ? selectedEntityTable as EntityType : 'affiliates');
  const entities: Entity[] = isValidEntityType ? entitiesHook.list : [];

  // Fetch users for assignee dropdown
  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .order('display_name');
      setUsers(data || []);
    }
    fetchUsers();
  }, []);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (ticket) {
        form.reset({
          title: ticket.title,
          description: ticket.description || '',
          entity_table: ticket.entity_table,
          entity_id: ticket.entity_id,
          ticket_type: ticket.ticket_type,
          priority: ticket.priority,
          status: ticket.status,
          assigned_to: ticket.assigned_to,
          due_date: ticket.due_date ? new Date(ticket.due_date) : null,
          resolution_notes: ticket.resolution_notes || '',
        });
      } else {
        form.reset({
          title: '',
          description: '',
          entity_table: defaultEntityTable || '',
          entity_id: defaultEntityId || '',
          ticket_type: '',
          priority: 'medium',
          status: 'open',
          assigned_to: null,
          due_date: null,
          resolution_notes: null,
        });
      }
    }
  }, [open, ticket, defaultEntityTable, defaultEntityId, form]);

  // Reset ticket type when entity table changes
  useEffect(() => {
    if (!isEditing) {
      form.setValue('ticket_type', '');
    }
  }, [selectedEntityTable, isEditing, form]);

  const availableTicketTypes = selectedEntityTable
    ? ticketTypesByEntity[selectedEntityTable] || []
    : [];

  const entityTableOptions = Object.entries(entityTableLabels).filter(
    ([key]) => key !== 'people'
  );

  async function onSubmit(data: TicketFormData) {
    if (!user) return;

    try {
      if (isEditing && ticket) {
        await updateTicket.mutateAsync({
          id: ticket.id,
          updates: {
            title: data.title,
            description: data.description || null,
            ticket_type: data.ticket_type,
            priority: data.priority,
            status: data.status,
            assigned_to: data.assigned_to || null,
            due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : null,
            resolution_notes: data.resolution_notes || null,
          },
        });
      } else {
        await createTicket.mutateAsync({
          title: data.title,
          description: data.description || null,
          entity_table: data.entity_table,
          entity_id: data.entity_id,
          ticket_type: data.ticket_type,
          priority: data.priority,
          assigned_to: data.assigned_to || null,
          due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : null,
          created_by: user.id,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Ticket' : 'Create Ticket'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="entity_table"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entityTableOptions.map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="entity_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedEntityTable}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedEntityTable ? 'Select entity' : 'Select entity type first'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              {entity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="ticket_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedEntityTable}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ticket type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTicketTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the issue..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allPriorities.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {ticketPriorityLabels[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {ticketStatusLabels[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === '__unassigned__' ? null : val)}
                    value={field.value || '__unassigned__'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__unassigned__">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.display_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (selectedStatus === 'resolved' || selectedStatus === 'closed') && (
              <FormField
                control={form.control}
                name="resolution_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="How was this ticket resolved?"
                        rows={2}
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTicket.isPending || updateTicket.isPending}>
                {isEditing ? 'Save Changes' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
