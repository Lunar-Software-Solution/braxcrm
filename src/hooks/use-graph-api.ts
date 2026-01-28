import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Email, EmailFolder, EmailRecipient } from "@/types/email";

interface GraphApiResponse<T> {
  value?: T[];
  error?: string;
}

interface GraphMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: { content: string; contentType: string };
  from: { emailAddress: { name: string; address: string } };
  toRecipients: { emailAddress: { name: string; address: string } }[];
  ccRecipients?: { emailAddress: { name: string; address: string } }[];
  receivedDateTime: string;
  isRead: boolean;
  isDraft?: boolean;
  hasAttachments: boolean;
  importance: string;
  flag?: { flagStatus: string };
  parentFolderId: string;
  attachments?: { id: string; name: string; contentType: string; size: number; isInline?: boolean }[];
}

interface GraphFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  isHidden?: boolean;
}

export function useGraphApi() {
  const callApi = useCallback(
    async <T>(
      action: string,
      params: Record<string, string> = {},
      options: { method?: string; body?: unknown } = {}
    ): Promise<T> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/graph-api`
      );
      url.searchParams.set("action", action);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      const response = await fetch(url.toString(), {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "API request failed");
      }

      return result;
    },
    []
  );

  const listFolders = useCallback(async (): Promise<EmailFolder[]> => {
    const result = await callApi<GraphApiResponse<GraphFolder>>("list-folders");

    return (result.value || []).map((folder): EmailFolder => ({
      id: folder.id,
      displayName: folder.displayName,
      parentFolderId: folder.parentFolderId,
      childFolderCount: folder.childFolderCount,
      unreadItemCount: folder.unreadItemCount,
      totalItemCount: folder.totalItemCount,
      isHidden: folder.isHidden ?? false,
    }));
  }, [callApi]);

  const listMessages = useCallback(
    async (
      folderId: string = "inbox",
      options: { top?: number; skip?: number; search?: string } = {}
    ): Promise<Email[]> => {
      const params: Record<string, string> = { folderId };
      if (options.top) params.top = options.top.toString();
      if (options.skip) params.skip = options.skip.toString();
      if (options.search) params.search = options.search;

      const result = await callApi<GraphApiResponse<GraphMessage>>(
        "list-messages",
        params
      );

      return (result.value || []).map((msg): Email => ({
        id: msg.id,
        subject: msg.subject,
        bodyPreview: msg.bodyPreview,
        from: msg.from ? { emailAddress: msg.from.emailAddress } : undefined,
        toRecipients: msg.toRecipients.map((r): EmailRecipient => ({
          emailAddress: r.emailAddress,
        })),
        receivedDateTime: msg.receivedDateTime,
        isRead: msg.isRead,
        isDraft: msg.isDraft ?? false,
        hasAttachments: msg.hasAttachments,
        importance: msg.importance as "low" | "normal" | "high",
        parentFolderId: msg.parentFolderId,
        flag: msg.flag ? { flagStatus: msg.flag.flagStatus as "notFlagged" | "complete" | "flagged" } : undefined,
      }));
    },
    [callApi]
  );

  const getMessage = useCallback(
    async (messageId: string): Promise<Email> => {
      const msg = await callApi<GraphMessage>("get-message", { messageId });

      return {
        id: msg.id,
        subject: msg.subject,
        bodyPreview: msg.bodyPreview,
        body: msg.body ? {
          contentType: msg.body.contentType as "text" | "html",
          content: msg.body.content,
        } : undefined,
        from: msg.from ? { emailAddress: msg.from.emailAddress } : undefined,
        toRecipients: msg.toRecipients.map((r): EmailRecipient => ({
          emailAddress: r.emailAddress,
        })),
        ccRecipients: msg.ccRecipients?.map((r): EmailRecipient => ({
          emailAddress: r.emailAddress,
        })),
        receivedDateTime: msg.receivedDateTime,
        isRead: msg.isRead,
        isDraft: msg.isDraft ?? false,
        hasAttachments: msg.hasAttachments,
        importance: msg.importance as "low" | "normal" | "high",
        parentFolderId: msg.parentFolderId,
        flag: msg.flag ? { flagStatus: msg.flag.flagStatus as "notFlagged" | "complete" | "flagged" } : undefined,
        attachments: msg.attachments?.map((a) => ({
          id: a.id,
          name: a.name,
          contentType: a.contentType,
          size: a.size,
          isInline: a.isInline ?? false,
        })),
      };
    },
    [callApi]
  );

  const sendMessage = useCallback(
    async (message: {
      subject: string;
      body: { contentType: string; content: string };
      toRecipients: { emailAddress: { address: string } }[];
      ccRecipients?: { emailAddress: { address: string } }[];
    }): Promise<void> => {
      await callApi("send-message", {}, { method: "POST", body: message });
    },
    [callApi]
  );

  const markAsRead = useCallback(
    async (messageId: string, isRead: boolean): Promise<void> => {
      await callApi(
        "update-message",
        { messageId },
        { method: "PATCH", body: { isRead } }
      );
    },
    [callApi]
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      await callApi("delete-message", { messageId }, { method: "DELETE" });
    },
    [callApi]
  );

  const moveMessage = useCallback(
    async (messageId: string, destinationId: string): Promise<void> => {
      await callApi(
        "move-message",
        { messageId },
        { method: "POST", body: { destinationId } }
      );
    },
    [callApi]
  );

  return {
    listFolders,
    listMessages,
    getMessage,
    sendMessage,
    markAsRead,
    deleteMessage,
    moveMessage,
  };
}
