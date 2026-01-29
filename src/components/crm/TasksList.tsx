import { useState, useEffect } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskCard } from './TaskCard';
import { TaskDialog } from './TaskDialog';
import { useTasks } from '@/hooks/use-tasks';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Task, TaskInsert, TaskUpdate, TaskStatus, EntityTable } from '@/types/activities';

interface TasksListProps {
  entityTable: EntityTable;
  entityId: string;
}

export function TasksList({ entityTable, entityId }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const { listTasksByEntity, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await listTasksByEntity(entityTable, entityId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [entityTable, entityId]);

  const handleSave = async (data: TaskInsert | TaskUpdate, isEdit: boolean) => {
    try {
      if (isEdit && editingTask) {
        await updateTask(editingTask.id, data as TaskUpdate);
        toast({ title: 'Task updated' });
      } else {
        await createTask(data as TaskInsert);
        toast({ title: 'Task added' });
      }
      loadTasks();
    } catch (error) {
      toast({
        title: isEdit ? 'Failed to update task' : 'Failed to add task',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

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

  const handleOpenDialog = () => {
    setEditingTask(null);
    setDialogOpen(true);
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'cancelled');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">
            {activeTasks.length} active, {completedTasks.length} completed
          </span>
          <Button size="sm" onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No tasks yet</p>
            <Button size="sm" variant="outline" onClick={handleOpenDialog}>
              <Plus className="h-4 w-4 mr-1" />
              Add first task
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                canEdit={task.created_by === user?.id || task.assigned_to === user?.id}
              />
            ))}
            {completedTasks.length > 0 && activeTasks.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Completed</p>
              </div>
            )}
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                canEdit={task.created_by === user?.id || task.assigned_to === user?.id}
              />
            ))}
          </div>
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editingTask}
        onSave={handleSave}
        entityTable={entityTable}
        entityId={entityId}
        userId={user?.id || ''}
      />
    </>
  );
}
