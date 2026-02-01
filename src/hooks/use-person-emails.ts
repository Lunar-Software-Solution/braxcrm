import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PersonEmail {
  id: string;
  microsoft_message_id: string;
  subject: string | null;
  body_preview: string | null;
  sender_email: string | null;
  sender_name: string | null;
  received_at: string;
  is_read: boolean;
  has_attachments: boolean;
  direction: string;
}

export function usePersonEmails(personId: string | null) {
  return useQuery({
    queryKey: ["person-emails", personId],
    queryFn: async () => {
      if (!personId) return [];

      const { data, error } = await supabase
        .from("email_messages")
        .select(`
          id,
          microsoft_message_id,
          subject,
          body_preview,
          sender_email,
          sender_name,
          received_at,
          is_read,
          has_attachments,
          direction
        `)
        .eq("person_id", personId)
        .order("received_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as PersonEmail[];
    },
    enabled: !!personId,
  });
}
