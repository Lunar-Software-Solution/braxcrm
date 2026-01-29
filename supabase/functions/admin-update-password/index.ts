import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { user_id, userId, password, action } = body;
    const targetUserId = user_id || userId;

    if (!targetUserId) {
      throw new Error("Missing user_id");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !callerUser) {
      throw new Error("Invalid authorization");
    }

    // Check if caller is admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      throw new Error("Only admins can perform this action");
    }

    // Handle suspend action
    if (action === "suspend") {
      if (targetUserId === callerUser.id) {
        throw new Error("You cannot suspend your own account");
      }

      const { error: suspendError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          status: "suspended", 
          suspended_at: new Date().toISOString(),
          suspended_by: callerUser.id 
        })
        .eq("user_id", targetUserId);

      if (suspendError) {
        throw suspendError;
      }

      return new Response(JSON.stringify({ success: true, message: "User suspended" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle unsuspend action
    if (action === "unsuspend") {
      const { error: unsuspendError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          status: "active", 
          suspended_at: null,
          suspended_by: null 
        })
        .eq("user_id", targetUserId);

      if (unsuspendError) {
        throw unsuspendError;
      }

      return new Response(JSON.stringify({ success: true, message: "User reactivated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle delete action
    if (action === "delete") {
      if (targetUserId === callerUser.id) {
        throw new Error("You cannot delete your own account");
      }

      await supabaseAdmin.from("user_entity_roles").delete().eq("user_id", targetUserId);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);
      await supabaseAdmin.from("profiles").delete().eq("user_id", targetUserId);

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (deleteError) {
        throw deleteError;
      }

      return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle password update (original functionality)
    if (!password) {
      throw new Error("Missing password");
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password }
    );

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, user: data.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
