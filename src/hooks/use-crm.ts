import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Company, Person, EmailMessage } from "@/types/crm";

export function useCRM() {
  // Companies
  const listCompanies = useCallback(async (workspaceId: string): Promise<Company[]> => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");

    if (error) throw error;
    return data || [];
  }, []);

  const getCompany = useCallback(async (companyId: string): Promise<Company | null> => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  const createCompany = useCallback(async (company: Omit<Company, "id" | "created_at" | "updated_at">): Promise<Company> => {
    const { data, error } = await supabase
      .from("companies")
      .insert(company)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const updateCompany = useCallback(async (companyId: string, updates: Partial<Company>): Promise<Company> => {
    const { data, error } = await supabase
      .from("companies")
      .update(updates)
      .eq("id", companyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const deleteCompany = useCallback(async (companyId: string): Promise<void> => {
    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", companyId);

    if (error) throw error;
  }, []);

  // People
  const listPeople = useCallback(async (workspaceId: string, options?: { companyId?: string }): Promise<Person[]> => {
    let query = supabase
      .from("people")
      .select("*, company:companies(*)")
      .eq("workspace_id", workspaceId)
      .order("name");

    if (options?.companyId) {
      query = query.eq("company_id", options.companyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }, []);

  const getPerson = useCallback(async (personId: string): Promise<Person | null> => {
    const { data, error } = await supabase
      .from("people")
      .select("*, company:companies(*)")
      .eq("id", personId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  const getPersonByEmail = useCallback(async (workspaceId: string, email: string): Promise<Person | null> => {
    const { data, error } = await supabase
      .from("people")
      .select("*, company:companies(*)")
      .eq("workspace_id", workspaceId)
      .ilike("email", email)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  const createPerson = useCallback(async (person: Omit<Person, "id" | "created_at" | "updated_at" | "company">): Promise<Person> => {
    const { data, error } = await supabase
      .from("people")
      .insert(person)
      .select("*, company:companies(*)")
      .single();

    if (error) throw error;
    return data;
  }, []);

  const updatePerson = useCallback(async (personId: string, updates: Partial<Person>): Promise<Person> => {
    const { data, error } = await supabase
      .from("people")
      .update(updates)
      .eq("id", personId)
      .select("*, company:companies(*)")
      .single();

    if (error) throw error;
    return data;
  }, []);

  const deletePerson = useCallback(async (personId: string): Promise<void> => {
    const { error } = await supabase
      .from("people")
      .delete()
      .eq("id", personId);

    if (error) throw error;
  }, []);

  // Email Messages
  const listEmailsByPerson = useCallback(async (personId: string): Promise<EmailMessage[]> => {
    const { data, error } = await supabase
      .from("email_messages")
      .select("*")
      .eq("person_id", personId)
      .order("received_at", { ascending: false });

    if (error) throw error;
    return (data || []).map(d => ({
      ...d,
      direction: d.direction as 'inbound' | 'outbound',
    }));
  }, []);

  const listRecentEmails = useCallback(async (workspaceId: string, limit = 50): Promise<EmailMessage[]> => {
    const { data, error } = await supabase
      .from("email_messages")
      .select("*, person:people(*, company:companies(*))")
      .eq("workspace_id", workspaceId)
      .order("received_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(d => ({
      ...d,
      direction: d.direction as 'inbound' | 'outbound',
    }));
  }, []);

  // Sync emails to CRM
  const syncEmails = useCallback(async (
    workspaceId: string,
    messages: unknown[],
    userEmail: string
  ): Promise<{ peopleCreated: number; companiesCreated: number; emailsSynced: number; errors: string[] }> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-emails`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId, messages, userEmail }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to sync emails");
    }

    return response.json();
  }, []);

  return {
    // Companies
    listCompanies,
    getCompany,
    createCompany,
    updateCompany,
    deleteCompany,
    // People
    listPeople,
    getPerson,
    getPersonByEmail,
    createPerson,
    updatePerson,
    deletePerson,
    // Email Messages
    listEmailsByPerson,
    listRecentEmails,
    syncEmails,
  };
}
