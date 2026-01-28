import { useState, useEffect, useCallback } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { FolderSidebar } from "./FolderSidebar";
import { EmailList } from "./EmailList";
import { EmailPreview } from "./EmailPreview";
import { ComposeDialog } from "./ComposeDialog";
import type { Email, EmailFolder } from "@/types/email";
import { useGraphApi } from "@/hooks/use-graph-api";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function EmailLayout() {
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
  
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);

  const { listFolders, listMessages, getMessage, markAsRead, deleteMessage, moveMessage, sendMessage } = useGraphApi();
  const { toast } = useToast();

  // Load folders on mount
  useEffect(() => {
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
  }, [listFolders, toast]);

  // Load emails when folder changes
  useEffect(() => {
    const loadEmails = async () => {
      if (!selectedFolderId) return;
      
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
  }, [selectedFolderId, listMessages, toast]);

  const currentFolder = folders.find((f) => f.id === selectedFolderId);

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

  if (foldersLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your mailbox...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen w-full">
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
              isLoading={emailsLoading}
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

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        replyTo={replyData}
        onSend={handleSendEmail}
      />
    </>
  );
}
