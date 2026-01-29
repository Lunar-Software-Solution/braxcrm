import { useState, useEffect } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCard } from '@/components/crm/TaskCard';
import { useTasks } from '@/hooks/use-tasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Task, TaskStatus } from '@/types/activities';
import { taskStatusLabels } from '@/types/activities';

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { listAllTasks, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTasks = async () => {
    try {
      setLoading(true);
      const filters = statusFilter !== 'all' ? { status: statusFilter as TaskStatus } : undefined;
      const data = await listAllTasks(filters);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast({
        title: 'Failed to load tasks',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [statusFilter]);

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await updateTask(taskId, { status });
      toast({ title: status === 'completed' ? 'Task completed!' : 'Task status updated' });
      loadTasks();
    } catch (error) {
      toast({
        title: 'Failed to update task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast({ title: 'Task deleted' });
      loadTasks();
    } catch (error) {
      toast({
        title: 'Failed to delete task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Manage tasks across all your contacts and entities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {taskStatusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No tasks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tasks you create from person or entity detail pages will appear here
            </p>
          </div>
        ) : statusFilter !== 'all' ? (
          <ScrollArea className="h-full p-4">
            <div className="grid gap-3 max-w-3xl">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  canEdit={task.created_by === user?.id}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full grid grid-cols-3 divide-x">
            {/* To Do Column */}
            <div className="flex flex-col">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-medium">To Do</span>
                  <Badge variant="secondary">{todoTasks.length}</Badge>
                </div>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {todoTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      canEdit={task.created_by === user?.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* In Progress Column */}
            <div className="flex flex-col">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-medium">In Progress</span>
                  <Badge variant="secondary">{inProgressTasks.length}</Badge>
                </div>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {inProgressTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      canEdit={task.created_by === user?.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Completed Column */}
            <div className="flex flex-col">
              <div className="p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Completed</span>
                  <Badge variant="secondary">{completedTasks.length}</Badge>
                </div>
              </div>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      canEdit={task.created_by === user?.id}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
