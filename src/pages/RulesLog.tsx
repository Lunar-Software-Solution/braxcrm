import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Tag, FileText, Building2, Eye, Folder, AlertTriangle, Layers, Brain, Clock, Zap, Loader2, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RuleLog {
  id: string;
  email_id: string;
  rule_id: string | null;
  action_type: string;
  action_config: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  processed_at: string;
  email?: {
    subject: string | null;
    category?: {
      name: string;
      color: string | null;
    } | null;
  };
  rule?: {
    name: string;
  } | null;
}

interface ClassificationLog {
  id: string;
  email_id: string;
  user_id: string | null;
  entity_table: string | null;
  confidence: number | null;
  source: string;
  success: boolean;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: string;
  email?: {
    subject: string | null;
  };
}

interface PendingProcessingEmail {
  id: string;
  subject: string | null;
  sender_email: string | null;
  sender_name: string | null;
  received_at: string;
  entity_table: string | null;
  ai_confidence: number | null;
  classification_source?: string | null;
}

const actionIcons: Record<string, React.ReactNode> = {
  tag: <Tag className="h-4 w-4" />,
  extract_invoice: <FileText className="h-4 w-4" />,
  assign_entity: <Building2 className="h-4 w-4" />,
  visibility: <Eye className="h-4 w-4" />,
  move_folder: <Folder className="h-4 w-4" />,
  mark_priority: <AlertTriangle className="h-4 w-4" />,
  assign_object_type: <Layers className="h-4 w-4" />,
  extract_attachments: <FileText className="h-4 w-4" />,
};

const actionLabels: Record<string, string> = {
  tag: "Apply Tag",
  extract_invoice: "Extract Invoice",
  assign_entity: "Assign Entity",
  visibility: "Set Visibility",
  move_folder: "Move to Folder",
  mark_priority: "Mark Priority",
  assign_object_type: "Assign Object Type",
  extract_attachments: "Extract Attachments",
  assign_role: "Assign Role",
};

const sourceIcons: Record<string, React.ReactNode> = {
  ai: <Brain className="h-4 w-4 text-purple-500" />,
  cache: <Zap className="h-4 w-4 text-yellow-500" />,
  manual: <Eye className="h-4 w-4 text-blue-500" />,
};

const entityLabels: Record<string, string> = {
  influencers: "Influencer",
  resellers: "Reseller",
  product_suppliers: "Product Supplier",
  expense_suppliers: "Expense Supplier",
  corporate_management: "Corporate Mgmt",
  personal_contacts: "Personal Contact",
  subscriptions: "Subscription",
};

export default function RulesLog() {
  const { data: ruleLogs, isLoading: rulesLoading } = useQuery({
    queryKey: ["rules-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_rule_logs")
        .select(`
          *,
          email:email_messages(
            subject,
            category:email_categories(name, color)
          ),
          rule:email_rules(name)
        `)
        .order("processed_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as unknown as RuleLog[];
    },
  });

  const { data: classificationLogs, isLoading: classificationLoading } = useQuery({
    queryKey: ["classification-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_classification_logs")
        .select(`
          *,
          email:email_messages(subject)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as unknown as ClassificationLog[];
    },
  });

  const { data: pendingEmails, isLoading: pendingLoading } = useQuery({
    queryKey: ["pending-processing-log"],
    queryFn: async () => {
      // First get pending emails
      const { data: emails, error } = await supabase
        .from("email_messages")
        .select(`
          id,
          subject,
          sender_email,
          sender_name,
          received_at,
          entity_table,
          ai_confidence
        `)
        .not("entity_table", "is", null)
        .eq("is_processed", false)
        .order("received_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get classification sources for these emails
      const emailIds = emails?.map(e => e.id) || [];
      if (emailIds.length === 0) return [];

      const { data: classLogs } = await supabase
        .from("email_classification_logs")
        .select("email_id, source")
        .in("email_id", emailIds)
        .eq("success", true)
        .order("created_at", { ascending: false });

      // Create a map of email_id to source (get the most recent)
      const sourceMap = new Map<string, string>();
      classLogs?.forEach(log => {
        if (!sourceMap.has(log.email_id)) {
          sourceMap.set(log.email_id, log.source);
        }
      });

      // Merge source into emails
      return emails?.map(email => ({
        ...email,
        classification_source: sourceMap.get(email.id) || null
      })) as PendingProcessingEmail[];
    },
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Processing Logs</h1>
        <p className="text-muted-foreground">
          View the history of AI classifications and rule actions
        </p>
      </div>

      <Tabs defaultValue="classification" className="w-full">
        <TabsList>
          <TabsTrigger value="classification" className="gap-2">
            <Brain className="h-4 w-4" />
            Classification Log
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Loader2 className="h-4 w-4" />
            Pending Processing
            {pendingEmails && pendingEmails.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingEmails.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Layers className="h-4 w-4" />
            Rules Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classification" className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Email Subject</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="w-[150px]">Processed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classificationLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : classificationLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No classification logs yet. Sync your inbox to trigger AI classification.
                    </TableCell>
                  </TableRow>
                ) : (
                  classificationLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {log.email?.subject || "No subject"}
                      </TableCell>
                      <TableCell>
                        {log.entity_table ? (
                          <Badge variant="outline">
                            {entityLabels[log.entity_table] || log.entity_table}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.confidence !== null ? (
                          <span className={log.confidence >= 0.8 ? "text-green-600" : log.confidence >= 0.5 ? "text-yellow-600" : "text-muted-foreground"}>
                            {Math.round(log.confidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {sourceIcons[log.source] || <Brain className="h-4 w-4" />}
                          <span className="text-sm capitalize">{log.source}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.processing_time_ms !== null ? (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">{log.processing_time_ms}ms</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {classificationLogs && classificationLogs.some((l) => !l.success) && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <h3 className="font-medium text-destructive mb-2">Failed Classifications</h3>
              <ul className="text-sm space-y-1">
                {classificationLogs
                  .filter((l) => !l.success)
                  .slice(0, 5)
                  .map((log) => (
                    <li key={log.id} className="text-destructive/80">
                      {log.email?.subject?.slice(0, 50) || "Unknown email"}: {log.error_message || "Unknown error"}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email Subject</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="w-[150px]">Received At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : pendingEmails?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No emails pending rules processing. All classified emails have been processed.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingEmails?.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium max-w-[250px] truncate">
                        {email.subject || "No subject"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {email.sender_name || email.sender_email || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entityLabels[email.entity_table || ""] || email.entity_table}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {email.classification_source === "cache" ? (
                          <div className="flex items-center gap-1.5">
                            <Database className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">Known Entity</span>
                          </div>
                        ) : email.classification_source === "manual" ? (
                          <div className="flex items-center gap-1.5">
                            <Eye className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">Manual</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Brain className="h-4 w-4 text-purple-500" />
                            <span className="text-sm text-muted-foreground">AI</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {email.ai_confidence !== null ? (
                          <span className={email.ai_confidence >= 0.8 ? "text-green-600" : email.ai_confidence >= 0.5 ? "text-yellow-600" : "text-muted-foreground"}>
                            {Math.round(email.ai_confidence * 100)}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(email.received_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Status</TableHead>
                  <TableHead>Email Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead className="w-[180px]">Processed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    </TableRow>
                  ))
                ) : ruleLogs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No rule processing logs yet. Sync your inbox to trigger automation.
                    </TableCell>
                  </TableRow>
                ) : (
                  ruleLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {log.email?.subject || "No subject"}
                      </TableCell>
                      <TableCell>
                        {log.email?.category ? (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: log.email.category.color || undefined,
                              color: log.email.category.color || undefined,
                            }}
                          >
                            {log.email.category.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {actionIcons[log.action_type] || <Layers className="h-4 w-4" />}
                          <span>{actionLabels[log.action_type] || log.action_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.rule?.name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(log.processed_at), "MMM d, h:mm a")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {ruleLogs && ruleLogs.some((l) => !l.success) && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <h3 className="font-medium text-destructive mb-2">Failed Actions</h3>
              <ul className="text-sm space-y-1">
                {ruleLogs
                  .filter((l) => !l.success)
                  .slice(0, 5)
                  .map((log) => (
                    <li key={log.id} className="text-destructive/80">
                      {log.action_type}: {log.error_message || "Unknown error"}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
