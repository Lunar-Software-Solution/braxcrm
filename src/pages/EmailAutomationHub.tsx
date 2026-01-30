import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Mail, 
  PlayCircle, 
  Zap, 
  Users, 
  Send,
  Plus,
  MoreHorizontal,
  Pause,
  Play,
  Trash2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmailSequences, useUpdateEmailSequence, useDeleteEmailSequence } from "@/hooks/use-email-sequences";
import { useEmailTriggers, useUpdateEmailTrigger, useDeleteEmailTrigger } from "@/hooks/use-email-triggers";
import { useEmailTemplates } from "@/hooks/use-email-templates";
import { useAutomationStats, useAutomationSendLog } from "@/hooks/use-automation-send-log";
import { getEntityDisplayName, formatDelay } from "@/types/email-automation";
import { format } from "date-fns";

export default function EmailAutomationHub() {
  const [activeTab, setActiveTab] = useState("sequences");
  
  const { data: sequences, isLoading: sequencesLoading } = useEmailSequences();
  const { data: triggers, isLoading: triggersLoading } = useEmailTriggers();
  const { data: templates, isLoading: templatesLoading } = useEmailTemplates();
  const { data: stats } = useAutomationStats();
  const { data: recentLogs } = useAutomationSendLog({ limit: 10 });
  
  const updateSequence = useUpdateEmailSequence();
  const deleteSequence = useDeleteEmailSequence();
  const updateTrigger = useUpdateEmailTrigger();
  const deleteTrigger = useDeleteEmailTrigger();

  const toggleSequenceActive = (id: string, currentActive: boolean) => {
    updateSequence.mutate({ id, updates: { is_active: !currentActive } });
  };

  const toggleTriggerActive = (id: string, currentActive: boolean) => {
    updateTrigger.mutate({ id, updates: { is_active: !currentActive } });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Email Automation</h1>
          <p className="text-muted-foreground">
            Manage email sequences, triggers, and templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/email-automation/templates/new">
              <FileText className="h-4 w-4 mr-2" />
              New Template
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/email-automation/triggers/new">
              <Zap className="h-4 w-4 mr-2" />
              New Trigger
            </Link>
          </Button>
          <Button asChild>
            <Link to="/email-automation/sequences/new">
              <Plus className="h-4 w-4 mr-2" />
              New Sequence
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Sequences</CardDescription>
            <CardTitle className="text-3xl">{stats?.activeSequences || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <PlayCircle className="h-3 w-3" />
              Running campaigns
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Triggers</CardDescription>
            <CardTitle className="text-3xl">{stats?.activeTriggers || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Event automations
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enrolled Contacts</CardDescription>
            <CardTitle className="text-3xl">{stats?.activeEnrollments || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              In active sequences
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Emails Sent (30d)</CardDescription>
            <CardTitle className="text-3xl">{stats?.sent || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Send className="h-3 w-3" />
              {stats?.failed || 0} failed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sequences">Sequences</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="sequences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Sequences</CardTitle>
              <CardDescription>
                Multi-step drip campaigns that send automated emails over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sequencesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : sequences?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sequences yet</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link to="/email-automation/sequences/new">Create your first sequence</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Enrolled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sequences?.map((sequence) => (
                      <TableRow key={sequence.id}>
                        <TableCell>
                          <Link 
                            to={`/email-automation/sequences/${sequence.id}`}
                            className="font-medium hover:underline"
                          >
                            {sequence.name}
                          </Link>
                          {sequence.description && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {sequence.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getEntityDisplayName(sequence.entity_table)}
                          </Badge>
                        </TableCell>
                        <TableCell>{sequence.enrollment_count || 0}</TableCell>
                        <TableCell>
                          <Badge variant={sequence.is_active ? "default" : "secondary"}>
                            {sequence.is_active ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/email-automation/sequences/${sequence.id}`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => toggleSequenceActive(sequence.id, sequence.is_active)}
                              >
                                {sequence.is_active ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteSequence.mutate(sequence.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Triggers</CardTitle>
              <CardDescription>
                Automated emails sent when specific events occur
              </CardDescription>
            </CardHeader>
            <CardContent>
              {triggersLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : triggers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No triggers yet</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link to="/email-automation/triggers/new">Create your first trigger</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Delay</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {triggers?.map((trigger) => (
                      <TableRow key={trigger.id}>
                        <TableCell>
                          <Link 
                            to={`/email-automation/triggers/${trigger.id}`}
                            className="font-medium hover:underline"
                          >
                            {trigger.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{trigger.trigger_type.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell>{getEntityDisplayName(trigger.entity_table)}</TableCell>
                        <TableCell>
                          {trigger.delay_minutes === 0 
                            ? 'Immediately' 
                            : `${trigger.delay_minutes} min`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trigger.is_active ? "default" : "secondary"}>
                            {trigger.is_active ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/email-automation/triggers/${trigger.id}`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => toggleTriggerActive(trigger.id, trigger.is_active)}
                              >
                                {trigger.is_active ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    Pause
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteTrigger.mutate(trigger.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Reusable email templates with personalization support
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : templates?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No templates yet</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link to="/email-automation/templates/new">Create your first template</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates?.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <Link 
                            to={`/email-automation/templates/${template.id}`}
                            className="font-medium hover:underline"
                          >
                            {template.name}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {template.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant={template.is_active ? "default" : "secondary"}>
                            {template.is_active ? "Active" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(template.updated_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/email-automation/templates/${template.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest email sends and automation activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!recentLogs || recentLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.automation_type === 'sequence' ? (
                              <><PlayCircle className="h-3 w-3 mr-1" /> Sequence</>
                            ) : (
                              <><Zap className="h-3 w-3 mr-1" /> Trigger</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.contact_email}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              log.status === 'sent' ? 'default' : 
                              log.status === 'pending' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
