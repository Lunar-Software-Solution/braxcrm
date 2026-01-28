import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");

      if (errorParam) {
        setStatus("error");
        setErrorMessage(errorDescription || errorParam);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setErrorMessage("Missing authorization code or state");
        return;
      }

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

        // Get current session for authorization header
        const { data: sessionData } = await supabase.auth.getSession();
        const authHeader = sessionData.session 
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {};

        // Exchange code for tokens via edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ms-auth?action=callback&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri)}`,
          { headers: authHeader }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Authentication failed");
        }

        // Clean up session storage
        sessionStorage.removeItem("ms_auth_state");
        sessionStorage.removeItem("ms_auth_redirect_uri");

        setStatus("success");
        
        // If user is already logged in, go to settings (adding account)
        // Otherwise, this was initial login flow - go to home
        const redirectTo = user ? "/settings" : "/";
        setTimeout(() => navigate(redirectTo), 1500);
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    processCallback();
  }, [searchParams, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle>Connecting account...</CardTitle>
              <CardDescription>
                Please wait while we connect your Microsoft account.
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Account Connected!</CardTitle>
              <CardDescription>
                Your Microsoft account has been linked successfully.
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Connection Failed</CardTitle>
              <CardDescription className="text-destructive">
                {errorMessage || "Something went wrong"}
              </CardDescription>
            </>
          )}
        </CardHeader>

        {status === "error" && (
          <CardContent className="flex justify-center gap-2">
            <Button onClick={() => navigate("/settings")} variant="outline">
              Back to Settings
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
