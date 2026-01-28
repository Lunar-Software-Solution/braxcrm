import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useMicrosoftAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRedirectUri = useCallback(() => {
    return `${window.location.origin}/auth/callback`;
  }, []);

  const initiateLogin = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const redirectUri = getRedirectUri();
      
      // Get current session for auth header (for adding accounts while logged in)
      const { data: sessionData } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (sessionData.session) {
        headers.Authorization = `Bearer ${sessionData.session.access_token}`;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ms-auth?action=authorize&redirect_uri=${encodeURIComponent(redirectUri)}`,
        { headers }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to get authorization URL");
      }

      const { url, state } = await response.json();

      // Store state for verification
      sessionStorage.setItem("ms_auth_state", state);
      sessionStorage.setItem("ms_auth_redirect_uri", redirectUri);

      // Redirect to Microsoft login
      window.location.href = url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setLoading(false);
      throw err;
    }
  }, [getRedirectUri]);

  return {
    initiateLogin,
    loading,
    error,
  };
}
