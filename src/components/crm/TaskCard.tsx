import { useState } from 'react';
import { CheckSquare, Edit2, Trash2, MoreVertical, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, isPast, isToday } from 'date-fns';
import type { Task, TaskStatus, TaskPriority } from '@/types/activities';
import { taskStatusLabels, taskPriorityLabels } from '@/types/activities';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  canEdit?: boolean;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const statusColors: Record<TaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

export function TaskCard({ task, onEdit, onDelete, onStatusChange, canEdit = true }: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isCompleted = task.status === 'completed';
  const isCancelled = task.status === 'cancelled';
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted && !isCancelled;
  const isDueToday = task.due_date && isToday(new Date(task.due_date));

  const handleCheckboxChange = (checked: boolean) => {
    if (onStatusChange) {
      onStatusChange(task.id, checked ? 'completed' : 'todo');
    }
  };

  return (
    <>
      <Card className={`group ${isCompleted || isCancelled ? 'opacity-60' : ''}`}>
        <CardHeader className="pb-2 flex flex-row items-start gap-3 space-y-0">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleCheckboxChange}
            disabled={!canEdit || isCancelled}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </h4>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(task)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className={statusColors[task.status]}>
              {taskStatusLabels[task.status]}
            </Badge>
            <Badge variant="outline" className={priorityColors[task.priority]}>
              {taskPriorityLabels[task.priority]}
            </Badge>
            {task.due_date && (
              <span className={`flex items-center gap-1 ${
                isOverdue ? 'text-destructive' : isDueToday ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
              }`}>
                <Calendar className="h-3 w-3" />
                {isOverdue ? 'Overdue: ' : isDueToday ? 'Due today' : ''}
                {format(new Date(task.due_date), 'MMM d')}
              </span>
            )}
            {task.assigned_user?.display_name && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                {task.assigned_user.display_name}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(task.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
