import { useState, useEffect, useCallback, useRef } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { FolderSidebar } from "./FolderSidebar";
import { EmailList } from "./EmailList";
import { EmailPreview } from "./EmailPreview";
import { ComposeDialog } from "./ComposeDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Email, EmailFolder } from "@/types/email";
import { useGraphApi, useMicrosoftAccounts, MicrosoftAccount } from "@/hooks/use-graph-api";
import { useCRM } from "@/hooks/use-crm";
import { useWorkspace } from "@/hooks/use-workspace";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, Mail, Plus, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function EmailLayout() {
  const [accounts, setAccounts] = useState<MicrosoftAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [fullEmail, setFullEmail] = useState<Email | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyData, setReplyData] = useState<{
    to: string;
    subject: string;
    body?: string;
  } | undefined>();
  
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncedFolders = useRef<Set<string>>(new Set());

  const { listAccounts } = useMicrosoftAccounts();
  const { listFolders, listMessages, getMessage, markAsRead, deleteMessage, moveMessage, sendMessage } = useGraphApi(selectedAccountId);
  const { syncEmails } = useCRM();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Load accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        const accountList = await listAccounts();
        setAccounts(accountList);
        
        // Select primary account or first available
        if (accountList.length > 0) {
          const primary = accountList.find(a => a.is_primary) || accountList[0];
          setSelectedAccountId(primary.id);
        }
      } catch (error) {
        console.error("Failed to load accounts:", error);
      } finally {
        setAccountsLoading(false);
      }
    };
    
    loadAccounts();
  }, [listAccounts]);

  // Load folders when account changes
  useEffect(() => {
    if (!selectedAccountId) {
      setFoldersLoading(false);
      return;
    }
    
    const loadFolders = async () => {
      try {
        setFoldersLoading(true);
        const folderList = await listFolders();
        setFolders(folderList);
        
        // Find inbox folder ID
        const inbox = folderList.find(f => 
          f.displayName.toLowerCase() === "inbox"
        );
        if (inbox) {
          setSelectedFolderId(inbox.id);
        }
      } catch (error) {
        console.error("Failed to load folders:", error);
        toast({
          title: "Failed to load folders",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setFoldersLoading(false);
      }
    };
    
    loadFolders();
  }, [selectedAccountId, listFolders, toast]);

  const currentFolder = folders.find((f) => f.id === selectedFolderId);
  const currentAccount = accounts.find(a => a.id === selectedAccountId);

  // Load emails when folder changes
  useEffect(() => {
    if (!selectedFolderId || !selectedAccountId) return;
    
    const loadEmails = async () => {
      try {
        setEmailsLoading(true);
        const emailList = await listMessages(selectedFolderId);
        setEmails(emailList);
      } catch (error) {
        console.error("Failed to load emails:", error);
        toast({
          title: "Failed to load emails",
          description: error instanceof Error ? error.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setEmailsLoading(false);
      }
    };
    
    loadEmails();
  }, [selectedFolderId, selectedAccountId, listMessages, toast]);

  // Sync emails to CRM (separate effect to handle async dependencies)
  useEffect(() => {
    if (!workspaceId || !selectedAccountId || !selectedFolderId || emails.length === 0) {
      return;
    }

    const userEmail = currentAccount?.microsoft_email;
    if (!userEmail) {
      console.log("No user email available for sync");
      return;
    }

    const folderKey = `${selectedAccountId}-${selectedFolderId}`;
    if (syncedFolders.current.has(folderKey)) {
      return;
    }

    const syncToBackend = async () => {
      syncedFolders.current.add(folderKey);
      setSyncing(true);
      
      try {
        console.log(`Syncing ${emails.length} emails to CRM for ${userEmail}`);
        
        // Transform emails to the format expected by sync-emails
        const messagesToSync = emails.map(email => ({
          id: email.id,
          subject: email.subject,
          bodyPreview: email.bodyPreview,
          from: email.from,
          toRecipients: email.toRecipients,
          receivedDateTime: email.receivedDateTime,
          isRead: email.isRead,
          hasAttachments: email.hasAttachments,
          conversationId: undefined,
          parentFolderId: email.parentFolderId,
        }));
        
        const result = await syncEmails(workspaceId, messagesToSync, userEmail);
        console.log("Sync result:", result);
        
        if (result.peopleCreated > 0) {
          toast({
            title: "Contacts synced",
            description: `Created ${result.peopleCreated} people`,
          });
        }
      } catch (syncError) {
        console.error("Failed to sync emails to CRM:", syncError);
        // Remove from synced set so it can retry
        syncedFolders.current.delete(folderKey);
      } finally {
        setSyncing(false);
      }
    };

    syncToBackend();
  }, [workspaceId, selectedAccountId, selectedFolderId, emails, currentAccount, syncEmails, toast]);

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
    setSelectedEmail(null);
    setFullEmail(null);
    setEmails([]);
    setFolders([]);
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedEmail(null);
    setFullEmail(null);
  };

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email);
    setEmailLoading(true);
    
    try {
      // Fetch full email content
      const full = await getMessage(email.id);
      setFullEmail(full);
      
      // Mark as read if unread
      if (!email.isRead) {
        await markAsRead(email.id, true);
        // Update local state
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, isRead: true } : e
        ));
      }
    } catch (error) {
      console.error("Failed to load email:", error);
      toast({
        title: "Failed to load email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    try {
      setEmailsLoading(true);
      const emailList = await listMessages(selectedFolderId);
      setEmails(emailList);
      toast({
        title: "Refreshed",
        description: "Email list updated",
      });
    } catch (error) {
      toast({
        title: "Failed to refresh",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setEmailsLoading(false);
    }
  }, [selectedFolderId, listMessages, toast]);

  const handleSyncContacts = useCallback(async () => {
    if (!workspaceId || emails.length === 0) {
      toast({
        title: "Cannot sync",
        description: "No emails to sync or workspace not ready",
        variant: "destructive",
      });
      return;
    }

    const userEmail = currentAccount?.microsoft_email;
    if (!userEmail) {
      toast({
        title: "Cannot sync",
        description: "Email address not available. Try refreshing the page.",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      const messagesToSync = emails.map(email => ({
        id: email.id,
        subject: email.subject,
        bodyPreview: email.bodyPreview,
        from: email.from,
        toRecipients: email.toRecipients,
        receivedDateTime: email.receivedDateTime,
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
        conversationId: undefined,
        parentFolderId: email.parentFolderId,
      }));
      
      const result = await syncEmails(workspaceId, messagesToSync, userEmail);
      
      toast({
        title: "Contacts synced",
        description: `Created ${result.peopleCreated} people`,
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }, [workspaceId, emails, currentAccount, syncEmails, toast]);

  const handleCompose = () => {
    setReplyData(undefined);
    setComposeOpen(true);
  };

  const handleReply = (email: Email) => {
    setReplyData({
      to: email.from?.emailAddress.address || "",
      subject: `Re: ${email.subject}`,
      body: `\n\n---\nOn ${new Date(email.receivedDateTime).toLocaleString()}, ${email.from?.emailAddress.name} wrote:\n\n${email.bodyPreview}`,
    });
    setComposeOpen(true);
  };

  const handleReplyAll = (email: Email) => {
    const allRecipients = [
      email.from?.emailAddress.address,
      ...email.toRecipients.map((r) => r.emailAddress.address),
    ].filter(Boolean).join(", ");
    
    setReplyData({
      to: allRecipients,
      subject: `Re: ${email.subject}`,
      body: `\n\n---\nOn ${new Date(email.receivedDateTime).toLocaleString()}, ${email.from?.emailAddress.name} wrote:\n\n${email.bodyPreview}`,
    });
    setComposeOpen(true);
  };

  const handleForward = (email: Email) => {
    setReplyData({
      to: "",
      subject: `Fwd: ${email.subject}`,
      body: `\n\n---\nForwarded message:\nFrom: ${email.from?.emailAddress.name} <${email.from?.emailAddress.address}>\nDate: ${new Date(email.receivedDateTime).toLocaleString()}\nSubject: ${email.subject}\n\n${email.bodyPreview}`,
    });
    setComposeOpen(true);
  };

  const handleDelete = async (email: Email) => {
    try {
      await deleteMessage(email.id);
      setEmails(prev => prev.filter(e => e.id !== email.id));
      setSelectedEmail(null);
      setFullEmail(null);
      toast({
        title: "Email deleted",
      });
    } catch (error) {
      toast({
        title: "Failed to delete email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (email: Email) => {
    try {
      // Find archive folder
      const archiveFolder = folders.find(f => 
        f.displayName.toLowerCase() === "archive"
      );
      
      if (archiveFolder) {
        await moveMessage(email.id, archiveFolder.id);
        setEmails(prev => prev.filter(e => e.id !== email.id));
        setSelectedEmail(null);
        setFullEmail(null);
        toast({
          title: "Email archived",
        });
      } else {
        toast({
          title: "Archive folder not found",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to archive email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async (message: {
    to: string;
    cc?: string;
    subject: string;
    body: string;
  }) => {
    try {
      await sendMessage({
        subject: message.subject,
        body: {
          contentType: "html",
          content: message.body.replace(/\n/g, "<br/>"),
        },
        toRecipients: message.to.split(",").map(email => ({
          emailAddress: { address: email.trim() },
        })),
        ccRecipients: message.cc ? message.cc.split(",").map(email => ({
          emailAddress: { address: email.trim() },
        })) : undefined,
      });
      
      toast({
        title: "Email sent",
      });
      setComposeOpen(false);
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // No accounts connected state
  if (!accountsLoading && accounts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">No mailbox connected</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Connect your Microsoft Outlook account to start managing your emails here.
        </p>
        <Button onClick={() => navigate("/settings")}>
          <Plus className="h-4 w-4 mr-2" />
          Connect Mailbox
        </Button>
      </div>
    );
  }

  if (accountsLoading || foldersLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your mailbox...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Account selector header */}
        {accounts.length > 0 && (
          <div className="border-b px-4 py-2 flex items-center justify-between bg-background shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">
                    {currentAccount?.microsoft_email || currentAccount?.display_name || "Select mailbox"}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-popover z-50">
                {accounts.map((account) => (
                  <DropdownMenuItem
                    key={account.id}
                    onClick={() => handleAccountSelect(account.id)}
                    className={account.id === selectedAccountId ? "bg-muted" : ""}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {account.display_name || account.microsoft_email || "Microsoft Account"}
                      </span>
                      {account.microsoft_email && account.display_name && (
                        <span className="text-xs text-muted-foreground">{account.microsoft_email}</span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => navigate("/settings")} className="text-muted-foreground">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage accounts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Main email layout */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Folder sidebar */}
            <ResizablePanel defaultSize={15} minSize={12} maxSize={25}>
              <FolderSidebar
                folders={folders}
                selectedFolderId={selectedFolderId}
                onFolderSelect={handleFolderSelect}
                onComposeClick={handleCompose}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Email list */}
            <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
              <EmailList
                emails={emails}
                selectedEmailId={selectedEmail?.id || null}
                folderName={currentFolder?.displayName || "Inbox"}
                onEmailSelect={handleEmailSelect}
                onRefresh={handleRefresh}
                onSyncContacts={handleSyncContacts}
                isLoading={emailsLoading}
                isSyncing={syncing}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Email preview */}
            <ResizablePanel defaultSize={55} minSize={30}>
              <EmailPreview
                email={fullEmail || selectedEmail}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onDelete={handleDelete}
                onArchive={handleArchive}
                isLoading={emailLoading}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        replyTo={replyData}
        onSend={handleSendEmail}
      />
    </>
  );
}
