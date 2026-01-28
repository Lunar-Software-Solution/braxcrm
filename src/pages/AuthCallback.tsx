import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMicrosoftAuth } from "@/hooks/use-microsoft-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback, error } = useMicrosoftAuth();
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
        await handleCallback(code, state);
        setStatus("success");
        // Redirect to home after successful auth
        setTimeout(() => navigate("/"), 1500);
      } catch (err) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <CardTitle>Signing you in...</CardTitle>
              <CardDescription>
                Please wait while we complete your Microsoft authentication.
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Welcome!</CardTitle>
              <CardDescription>
                Authentication successful. Redirecting to your inbox...
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Authentication Failed</CardTitle>
              <CardDescription className="text-destructive">
                {errorMessage || error || "Something went wrong"}
              </CardDescription>
            </>
          )}
        </CardHeader>

        {status === "error" && (
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate("/login")} variant="outline">
              Back to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
