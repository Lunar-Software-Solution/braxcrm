import { useState, useEffect } from 'react';
import { Target, Filter, DollarSign } from 'lucide-react';
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
import { OpportunityCard } from '@/components/crm/OpportunityCard';
import { useOpportunities } from '@/hooks/use-opportunities';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Opportunity, OpportunityStage } from '@/types/activities';
import { opportunityStageLabels } from '@/types/activities';

const stageOrder: OpportunityStage[] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

export default function Opportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<string>('all');

  const { listAllOpportunities, deleteOpportunity } = useOpportunities();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const filters = stageFilter !== 'all' ? { stage: stageFilter as OpportunityStage } : undefined;
      const data = await listAllOpportunities(filters);
      setOpportunities(data);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
      toast({
        title: 'Failed to load opportunities',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [stageFilter]);

  const handleDelete = async (opportunityId: string) => {
    try {
      await deleteOpportunity(opportunityId);
      toast({ title: 'Opportunity deleted' });
      loadOpportunities();
    } catch (error) {
      toast({
        title: 'Failed to delete opportunity',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const totalValue = opportunities
    .filter(o => o.stage !== 'lost')
    .reduce((sum, o) => sum + (o.value || 0), 0);

  const weightedValue = opportunities
    .filter(o => o.stage !== 'lost' && o.stage !== 'won')
    .reduce((sum, o) => sum + ((o.value || 0) * (o.probability || 0) / 100), 0);

  const opportunitiesByStage = stageOrder.reduce((acc, stage) => {
    acc[stage] = opportunities.filter(o => o.stage === stage);
    return acc;
  }, {} as Record<OpportunityStage, Opportunity[]>);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Opportunities</h1>
          <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Pipeline: ${totalValue.toLocaleString()}
            </span>
            <span>Weighted: ${Math.round(weightedValue).toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stageOrder.map((s) => (
                <SelectItem key={s} value={s}>
                  {opportunityStageLabels[s]}
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
            <p className="text-muted-foreground">Loading opportunities...</p>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No opportunities yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Opportunities you create from person or entity detail pages will appear here
            </p>
          </div>
        ) : stageFilter !== 'all' ? (
          <ScrollArea className="h-full p-4">
            <div className="grid gap-3 max-w-3xl">
              {opportunities.map((opp) => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onDelete={handleDelete}
                  canEdit={opp.created_by === user?.id}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full overflow-x-auto">
            <div className="flex h-full min-w-max divide-x">
              {stageOrder.filter(s => s !== 'won' && s !== 'lost').map((stage) => (
                <div key={stage} className="w-72 flex flex-col">
                  <div className="p-3 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{opportunityStageLabels[stage]}</span>
                        <Badge variant="secondary">{opportunitiesByStage[stage].length}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ${opportunitiesByStage[stage].reduce((s, o) => s + (o.value || 0), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-3">
                    <div className="space-y-3">
                      {opportunitiesByStage[stage].map((opp) => (
                        <OpportunityCard
                          key={opp.id}
                          opportunity={opp}
                          onDelete={handleDelete}
                          canEdit={opp.created_by === user?.id}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ))}
              
              {/* Won & Lost combined */}
              <div className="w-72 flex flex-col">
                <div className="p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Closed</span>
                    <Badge variant="secondary">
                      {opportunitiesByStage['won'].length + opportunitiesByStage['lost'].length}
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-3">
                    {[...opportunitiesByStage['won'], ...opportunitiesByStage['lost']].map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        onDelete={handleDelete}
                        canEdit={opp.created_by === user?.id}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
