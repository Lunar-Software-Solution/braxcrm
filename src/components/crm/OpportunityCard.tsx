import { useState } from 'react';
import { Target, Edit2, Trash2, MoreVertical, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import { format } from 'date-fns';
import type { Opportunity, OpportunityStage } from '@/types/activities';
import { opportunityStageLabels } from '@/types/activities';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onEdit?: (opportunity: Opportunity) => void;
  onDelete?: (opportunityId: string) => void;
  canEdit?: boolean;
}

const stageColors: Record<OpportunityStage, string> = {
  lead: 'bg-muted text-muted-foreground',
  qualified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  proposal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  negotiation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function OpportunityCard({ opportunity, onEdit, onDelete, canEdit = true }: OpportunityCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isClosed = opportunity.stage === 'won' || opportunity.stage === 'lost';

  return (
    <>
      <Card className={`group ${isClosed ? 'opacity-75' : ''}`}>
        <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium truncate">{opportunity.name}</h4>
            </div>
            {opportunity.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {opportunity.description}
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
                <DropdownMenuItem onClick={() => onEdit?.(opportunity)}>
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
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={stageColors[opportunity.stage]}>
              {opportunityStageLabels[opportunity.stage]}
            </Badge>
            {opportunity.value != null && (
              <span className="flex items-center gap-1 text-sm font-medium">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(opportunity.value, opportunity.currency)}
              </span>
            )}
            {opportunity.expected_close_date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(opportunity.expected_close_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
          {opportunity.probability != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Probability</span>
                <span>{opportunity.probability}%</span>
              </div>
              <Progress value={opportunity.probability} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{opportunity.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(opportunity.id);
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
