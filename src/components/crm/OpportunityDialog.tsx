import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import type { Opportunity, OpportunityInsert, OpportunityUpdate, OpportunityStage } from '@/types/activities';
import { opportunityStageLabels } from '@/types/activities';

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: Opportunity | null;
  onSave: (data: OpportunityInsert | OpportunityUpdate, isEdit: boolean) => Promise<void>;
  entityTable: string;
  entityId: string;
  userId: string;
}

export function OpportunityDialog({
  open,
  onOpenChange,
  opportunity,
  onSave,
  entityTable,
  entityId,
  userId,
}: OpportunityDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [stage, setStage] = useState<OpportunityStage>('lead');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [probability, setProbability] = useState(50);
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [saving, setSaving] = useState(false);

  const isEdit = !!opportunity;

  useEffect(() => {
    if (opportunity) {
      setName(opportunity.name);
      setDescription(opportunity.description || '');
      setStage(opportunity.stage);
      setValue(opportunity.value?.toString() || '');
      setCurrency(opportunity.currency);
      setProbability(opportunity.probability ?? 50);
      setExpectedCloseDate(opportunity.expected_close_date || '');
    } else {
      setName('');
      setDescription('');
      setStage('lead');
      setValue('');
      setCurrency('USD');
      setProbability(50);
      setExpectedCloseDate('');
    }
  }, [opportunity, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const numericValue = value ? parseFloat(value) : null;
      
      if (isEdit) {
        await onSave({
          name,
          description: description || null,
          stage,
          value: numericValue,
          currency,
          probability,
          expected_close_date: expectedCloseDate || null,
        }, true);
      } else {
        await onSave({
          name,
          description: description || null,
          stage,
          value: numericValue,
          currency,
          probability,
          expected_close_date: expectedCloseDate || null,
          entity_table: entityTable as any,
          entity_id: entityId,
          created_by: userId,
        }, false);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Opportunity' : 'Add Opportunity'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Opportunity name..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opportunity description..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as OpportunityStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(opportunityStageLabels) as OpportunityStage[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {opportunityStageLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Probability: {probability}%</Label>
            <Slider
              value={[probability]}
              onValueChange={([v]) => setProbability(v)}
              min={0}
              max={100}
              step={5}
              className="py-2"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
            <Input
              id="expectedCloseDate"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Opportunity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
