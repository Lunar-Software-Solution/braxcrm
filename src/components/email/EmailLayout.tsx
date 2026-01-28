import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { FolderSidebar } from "./FolderSidebar";
import { EmailList } from "./EmailList";
import { EmailPreview } from "./EmailPreview";
import { ComposeDialog } from "./ComposeDialog";
import type { Email, EmailFolder } from "@/types/email";
import { mockFolders, mockEmails } from "@/types/email";

export function EmailLayout() {
  const [folders] = useState<EmailFolder[]>(mockFolders);
  const [emails] = useState<Email[]>(mockEmails);
  const [selectedFolderId, setSelectedFolderId] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyData, setReplyData] = useState<{
    to: string;
    subject: string;
    body?: string;
  } | undefined>();

  const currentFolder = folders.find((f) => f.id === selectedFolderId);
  const filteredEmails = emails.filter((e) => e.parentFolderId === selectedFolderId);

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedEmail(null);
  };

  const handleEmailSelect = (email: Email) => {
    setSelectedEmail(email);
    // TODO: Mark as read via Microsoft Graph API
  };

  const handleRefresh = () => {
    // TODO: Fetch emails from Microsoft Graph API
    console.log("Refreshing emails...");
  };

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

  const handleDelete = (email: Email) => {
    // TODO: Delete email via Microsoft Graph API
    console.log("Deleting email:", email.id);
    setSelectedEmail(null);
  };

  const handleArchive = (email: Email) => {
    // TODO: Archive email via Microsoft Graph API
    console.log("Archiving email:", email.id);
    setSelectedEmail(null);
  };

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
              emails={filteredEmails}
              selectedEmailId={selectedEmail?.id || null}
              folderName={currentFolder?.displayName || "Inbox"}
              onEmailSelect={handleEmailSelect}
              onRefresh={handleRefresh}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Email preview */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <EmailPreview
              email={selectedEmail}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onDelete={handleDelete}
              onArchive={handleArchive}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        replyTo={replyData}
      />
    </>
  );
}
