import { useState } from "react";
import {
  X,
  Mail,
  Phone,
  Calendar,
  User,
  ExternalLink,
  Check,
  XCircle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { EntityWithStatus, EntityStatus } from "@/types/approvals";
import { entityStatusLabels } from "@/types/approvals";
import { format } from "date-fns";

interface ApprovalDetailPanelProps {
  entity: EntityWithStatus;
  entityColor: string;
  onClose: () => void;
  onUpdateStatus: (status: EntityStatus, rejectionReason?: string) => Promise<void>;
  isUpdating: boolean;
}

export function ApprovalDetailPanel({
  entity,
  entityColor,
  onClose,
  onUpdateStatus,
  isUpdating,
}: ApprovalDetailPanelProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleReject = async () => {
    await onUpdateStatus("rejected", rejectionReason);
    setRejectDialogOpen(false);
    setRejectionReason("");
  };

  const getNextStatus = (): EntityStatus | null => {
    switch (entity.status) {
      case "draft":
        return "pending";
      case "pending":
        return "under_review";
      case "under_review":
        return "approved";
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={entity.avatar_url || undefined} />
            <AvatarFallback
              className="text-sm text-white font-medium"
              style={{ backgroundColor: entityColor }}
            >
              {getInitials(entity.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-lg">{entity.name}</h2>
            <StatusBadge status={entity.status} />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Contact Information
            </h3>
            <div className="space-y-2">
              {entity.email ? (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${entity.email}`}
                    className="text-primary hover:underline"
                  >
                    {entity.email}
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>No email</span>
                </div>
              )}
              {entity.phone ? (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${entity.phone}`}
                    className="text-primary hover:underline"
                  >
                    {entity.phone}
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>No phone</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Source Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Source
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{entity.source || "Manual"}</span>
              </div>
              {entity.source_reference && (
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Ref: {entity.source_reference}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Dates */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Timeline
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Created: {format(new Date(entity.created_at), "PPp")}
                </span>
              </div>
              {entity.reviewed_at && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Reviewed: {format(new Date(entity.reviewed_at), "PPp")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Reason */}
          {entity.status === "rejected" && entity.rejection_reason && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-destructive mb-2">
                  Rejection Reason
                </h3>
                <p className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">
                  {entity.rejection_reason}
                </p>
              </div>
            </>
          )}

          {/* Notes */}
          {entity.notes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap">{entity.notes}</p>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      {entity.status !== "approved" && entity.status !== "rejected" && (
        <div className="p-4 border-t space-y-2">
          <div className="flex gap-2">
            {nextStatus && (
              <Button
                className="flex-1"
                onClick={() => onUpdateStatus(nextStatus)}
                disabled={isUpdating}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Move to {entityStatusLabels[nextStatus]}
              </Button>
            )}
            {entity.status === "under_review" && (
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onUpdateStatus("approved")}
                disabled={isUpdating}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
            )}
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setRejectDialogOpen(true)}
            disabled={isUpdating}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {entity.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isUpdating}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
