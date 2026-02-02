import type { EntityType } from "./entities";

export type EntityStatus = 'draft' | 'pending' | 'under_review' | 'approved' | 'rejected';

export const entityStatusLabels: Record<EntityStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const entityStatusColors: Record<EntityStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  under_review: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const statusOrder: EntityStatus[] = ['draft', 'pending', 'under_review', 'approved', 'rejected'];

export interface EntityWithStatus {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url: string | null;
  status: EntityStatus;
  source: string | null;
  source_reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAction {
  entityType: EntityType;
  entityId: string;
  newStatus: EntityStatus;
  rejectionReason?: string;
}

export interface EntityStatusCounts {
  draft: number;
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  total: number;
}
