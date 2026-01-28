// Email types for Microsoft Graph API integration

export interface EmailAddress {
  name: string;
  address: string;
}

export interface EmailRecipient {
  emailAddress: EmailAddress;
}

export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

export interface Email {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: {
    contentType: "text" | "html";
    content: string;
  };
  from?: EmailRecipient;
  toRecipients: EmailRecipient[];
  ccRecipients?: EmailRecipient[];
  bccRecipients?: EmailRecipient[];
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  isDraft: boolean;
  importance: "low" | "normal" | "high";
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  conversationId?: string;
  parentFolderId: string;
  flag?: {
    flagStatus: "notFlagged" | "complete" | "flagged";
  };
}

export interface EmailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  isHidden: boolean;
}

export interface EmailCompose {
  subject: string;
  body: {
    contentType: "text" | "html";
    content: string;
  };
  toRecipients: EmailRecipient[];
  ccRecipients?: EmailRecipient[];
  bccRecipients?: EmailRecipient[];
  attachments?: File[];
}

// Mock data for development
export const mockFolders: EmailFolder[] = [
  { id: "inbox", displayName: "Inbox", childFolderCount: 0, unreadItemCount: 12, totalItemCount: 156, isHidden: false },
  { id: "drafts", displayName: "Drafts", childFolderCount: 0, unreadItemCount: 0, totalItemCount: 3, isHidden: false },
  { id: "sentitems", displayName: "Sent Items", childFolderCount: 0, unreadItemCount: 0, totalItemCount: 89, isHidden: false },
  { id: "deleteditems", displayName: "Deleted Items", childFolderCount: 0, unreadItemCount: 0, totalItemCount: 45, isHidden: false },
  { id: "archive", displayName: "Archive", childFolderCount: 0, unreadItemCount: 0, totalItemCount: 234, isHidden: false },
  { id: "junkemail", displayName: "Junk Email", childFolderCount: 0, unreadItemCount: 2, totalItemCount: 8, isHidden: false },
];

export const mockEmails: Email[] = [
  {
    id: "1",
    subject: "Q4 Sales Report Review Meeting",
    bodyPreview: "Hi team, I've attached the Q4 sales report for your review. Please go through the key metrics before our meeting tomorrow at 2 PM...",
    body: {
      contentType: "html",
      content: "<p>Hi team,</p><p>I've attached the Q4 sales report for your review. Please go through the key metrics before our meeting tomorrow at 2 PM.</p><p>Key highlights:</p><ul><li>Revenue up 15% YoY</li><li>New customer acquisition improved by 23%</li><li>Customer retention at 94%</li></ul><p>Best regards,<br/>Sarah</p>"
    },
    from: { emailAddress: { name: "Sarah Johnson", address: "sarah.johnson@company.com" } },
    toRecipients: [{ emailAddress: { name: "You", address: "you@company.com" } }],
    receivedDateTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    isRead: false,
    isDraft: false,
    importance: "high",
    hasAttachments: true,
    parentFolderId: "inbox",
    flag: { flagStatus: "flagged" }
  },
  {
    id: "2",
    subject: "Re: Project Timeline Update",
    bodyPreview: "Thanks for the update. I think we should push the deadline by a week to ensure quality...",
    from: { emailAddress: { name: "Michael Chen", address: "m.chen@techcorp.io" } },
    toRecipients: [{ emailAddress: { name: "You", address: "you@company.com" } }],
    receivedDateTime: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    isRead: false,
    isDraft: false,
    importance: "normal",
    hasAttachments: false,
    parentFolderId: "inbox"
  },
  {
    id: "3",
    subject: "New Feature Request from Client",
    bodyPreview: "The Acme Corp team has requested a new dashboard feature. They want real-time analytics...",
    from: { emailAddress: { name: "Emily Rodriguez", address: "emily@clientsuccess.com" } },
    toRecipients: [{ emailAddress: { name: "You", address: "you@company.com" } }],
    receivedDateTime: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    isRead: true,
    isDraft: false,
    importance: "normal",
    hasAttachments: false,
    parentFolderId: "inbox"
  },
  {
    id: "4",
    subject: "Weekly Team Standup Notes",
    bodyPreview: "Here are the notes from today's standup. Action items: Complete API integration by Friday...",
    from: { emailAddress: { name: "David Kim", address: "david.kim@company.com" } },
    toRecipients: [{ emailAddress: { name: "You", address: "you@company.com" } }],
    receivedDateTime: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    isRead: true,
    isDraft: false,
    importance: "normal",
    hasAttachments: true,
    parentFolderId: "inbox"
  },
  {
    id: "5",
    subject: "Invoice #INV-2024-0892",
    bodyPreview: "Please find attached the invoice for the consulting services rendered in December...",
    from: { emailAddress: { name: "Billing Department", address: "billing@vendor.com" } },
    toRecipients: [{ emailAddress: { name: "You", address: "you@company.com" } }],
    receivedDateTime: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    isRead: true,
    isDraft: false,
    importance: "low",
    hasAttachments: true,
    parentFolderId: "inbox"
  },
  {
    id: "6",
    subject: "Lunch next week?",
    bodyPreview: "Hey! It's been a while since we caught up. Are you free for lunch next Tuesday or Wednesday?",
    from: { emailAddress: { name: "Alex Thompson", address: "alex.t@personal.com" } },
    toRecipients: [{ emailAddress: { name: "You", address: "you@company.com" } }],
    receivedDateTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    isRead: true,
    isDraft: false,
    importance: "normal",
    hasAttachments: false,
    parentFolderId: "inbox"
  },
  {
    id: "7",
    subject: "Security Alert: New login detected",
    bodyPreview: "A new sign-in to your account was detected from a new device. If this wasn't you...",
    from: { emailAddress: { name: "Security Team", address: "security@company.com" } },
    toRecipients: [{ emailAddress: { name: "You", address: "you@company.com" } }],
    receivedDateTime: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    isRead: false,
    isDraft: false,
    importance: "high",
    hasAttachments: false,
    parentFolderId: "inbox"
  },
];
