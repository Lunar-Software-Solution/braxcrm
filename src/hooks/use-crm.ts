import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Person, EmailMessage, ObjectType, PersonObjectType } from "@/types/crm";

export function useCRM() {
  // Object Types
  const listObjectTypes = useCallback(async (workspaceId: string): Promise<ObjectType[]> => {
    const { data, error } = await supabase
      .from("object_types")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("sort_order");

    if (error) throw error;
    return data || [];
  }, []);

  const getObjectType = useCallback(async (objectTypeId: string): Promise<ObjectType | null> => {
    const { data, error } = await supabase
      .from("object_types")
      .select("*")
      .eq("id", objectTypeId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  const createObjectType = useCallback(async (objectType: Omit<ObjectType, "id" | "created_at" | "updated_at">): Promise<ObjectType> => {
    const { data, error } = await supabase
      .from("object_types")
      .insert(objectType)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const updateObjectType = useCallback(async (objectTypeId: string, updates: Partial<ObjectType>): Promise<ObjectType> => {
    const { data, error } = await supabase
      .from("object_types")
      .update(updates)
      .eq("id", objectTypeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  const deleteObjectType = useCallback(async (objectTypeId: string): Promise<void> => {
    const { error } = await supabase
      .from("object_types")
      .delete()
      .eq("id", objectTypeId);

    if (error) throw error;
  }, []);

  // Person Object Types (assignments)
  const getPersonObjectTypes = useCallback(async (personId: string): Promise<PersonObjectType[]> => {
    const { data, error } = await supabase
      .from("person_object_types")
      .select("*, object_type:object_types(*)")
      .eq("person_id", personId);

    if (error) throw error;
    return (data || []).map(d => ({
      ...d,
      source: d.source as 'manual' | 'email_rule' | 'ai_suggestion',
    }));
  }, []);

  const assignObjectTypeToPerson = useCallback(async (
    personId: string,
    objectTypeId: string,
    source: 'manual' | 'email_rule' | 'ai_suggestion' = 'manual',
    assignedBy?: string
  ): Promise<void> => {
    const { error } = await supabase
      .from("person_object_types")
      .upsert({
        person_id: personId,
        object_type_id: objectTypeId,
        source,
        assigned_by: assignedBy || null,
      }, { onConflict: "person_id,object_type_id" });

    if (error) throw error;
  }, []);

  const removeObjectTypeFromPerson = useCallback(async (personId: string, objectTypeId: string): Promise<void> => {
    const { error } = await supabase
      .from("person_object_types")
      .delete()
      .eq("person_id", personId)
      .eq("object_type_id", objectTypeId);

    if (error) throw error;
  }, []);

  // People
  const listPeople = useCallback(async (workspaceId: string, options?: { objectTypeId?: string }): Promise<Person[]> => {
    let query = supabase
      .from("people")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("name");

    const { data, error } = await query;

    if (error) throw error;

    let people = data || [];

    // If filtering by object type, we need to join with person_object_types
    if (options?.objectTypeId) {
      const { data: assignments } = await supabase
        .from("person_object_types")
        .select("person_id")
        .eq("object_type_id", options.objectTypeId);

      const personIds = new Set((assignments || []).map(a => a.person_id));
      people = people.filter(p => personIds.has(p.id));
    }

    // Fetch object types for each person
    const personIds = people.map(p => p.id);
    if (personIds.length > 0) {
      const { data: allAssignments } = await supabase
        .from("person_object_types")
        .select("*, object_type:object_types(*)")
        .in("person_id", personIds);

      const assignmentsByPerson = new Map<string, PersonObjectType[]>();
      (allAssignments || []).forEach(a => {
        const list = assignmentsByPerson.get(a.person_id) || [];
        list.push({
          ...a,
          source: a.source as 'manual' | 'email_rule' | 'ai_suggestion',
        });
        assignmentsByPerson.set(a.person_id, list);
      });

      people = people.map(p => ({
        ...p,
        object_types: assignmentsByPerson.get(p.id) || [],
      }));
    }

    return people;
  }, []);

  const getPerson = useCallback(async (personId: string): Promise<Person | null> => {
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("id", personId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Fetch object types
    const { data: assignments } = await supabase
      .from("person_object_types")
      .select("*, object_type:object_types(*)")
      .eq("person_id", personId);

    return {
      ...data,
      object_types: (assignments || []).map(a => ({
        ...a,
        source: a.source as 'manual' | 'email_rule' | 'ai_suggestion',
      })),
    };
  }, []);

  const getPersonByEmail = useCallback(async (workspaceId: string, email: string): Promise<Person | null> => {
    const { data, error } = await supabase
      .from("people")
      .select("*")
      .eq("workspace_id", workspaceId)
      .ilike("email", email)
      .maybeSingle();

    if (error) throw error;
    return data;
  }, []);

  const createPerson = useCallback(async (person: Omit<Person, "id" | "created_at" | "updated_at" | "object_types">): Promise<Person> => {
    const { data, error } = await supabase
      .from("people")
      .insert(person)
      .select()
      .single();

    if (error) throw error;
    return { ...data, object_types: [] };
  }, []);

  const updatePerson = useCallback(async (personId: string, updates: Partial<Person>): Promise<Person> => {
    // Remove object_types from updates as it's not a direct column
    const { object_types, ...updateData } = updates;
    
    const { data, error } = await supabase
      .from("people")
      .update(updateData)
      .eq("id", personId)
      .select()
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
      .select("*, person:people(*)")
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
  ): Promise<{ peopleCreated: number; emailsSynced: number; errors: string[] }> => {
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
    // Object Types
    listObjectTypes,
    getObjectType,
    createObjectType,
    updateObjectType,
    deleteObjectType,
    // Person Object Types
    getPersonObjectTypes,
    assignObjectTypeToPerson,
    removeObjectTypeFromPerson,
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
