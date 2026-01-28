import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MsAuthUser {
  id: string;
  email: string;
  name: string;
}

interface CallbackResult {
  token: string;
  token_type: string;
  email: string;
  user: MsAuthUser;
  is_new_user: boolean;
}

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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ms-auth?action=authorize&redirect_uri=${encodeURIComponent(redirectUri)}`
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

  const handleCallback = useCallback(async (code: string, state: string) => {
    setLoading(true);
    setError(null);

    try {
      // Verify state
      const storedState = sessionStorage.getItem("ms_auth_state");
      const redirectUri = sessionStorage.getItem("ms_auth_redirect_uri");

      if (state !== storedState) {
        throw new Error("Invalid state parameter");
      }

      if (!redirectUri) {
        throw new Error("Missing redirect URI");
      }

      // Exchange code for tokens
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ms-auth?action=callback&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Authentication failed");
      }

      const result: CallbackResult = await response.json();

      // Clean up session storage
      sessionStorage.removeItem("ms_auth_state");
      sessionStorage.removeItem("ms_auth_redirect_uri");

      // Verify the magic link token to create a session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: result.token,
        type: "magiclink",
      });

      if (verifyError) {
        throw verifyError;
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Callback failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    initiateLogin,
    handleCallback,
    loading,
    error,
  };
}
