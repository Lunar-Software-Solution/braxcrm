import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMicrosoftAuth } from "@/hooks/use-microsoft-auth";
import { useUserRoles } from "@/hooks/use-user-roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Mail,
  Plus,
  Trash2,
  Star,
  Loader2,
  User,
  Shield,
  Bell,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";



interface MicrosoftAccount {
  id: string;
  microsoft_email: string | null;
  display_name: string | null;
  is_primary: boolean;
  created_at: string;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { initiateLogin } = useMicrosoftAuth();
  const { isAdmin, entityRoles, isLoading: isRolesLoading } = useUserRoles();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [accounts, setAccounts] = useState<MicrosoftAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("microsoft_tokens")
        .select("id, microsoft_email, display_name, is_primary, created_at")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Failed to load accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccount = async () => {
    setConnecting(true);
    try {
      await initiateLogin();
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Could not connect to Microsoft",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleSetPrimary = async (accountId: string) => {
    try {
      // First, set all accounts to non-primary
      await supabase
        .from("microsoft_tokens")
        .update({ is_primary: false })
        .eq("user_id", user?.id);

      // Then set the selected account as primary
      const { error } = await supabase
        .from("microsoft_tokens")
        .update({ is_primary: true })
        .eq("id", accountId);

      if (error) throw error;

      setAccounts(prev => prev.map(acc => ({
        ...acc,
        is_primary: acc.id === accountId,
      })));

      toast({ title: "Primary account updated" });
    } catch (error) {
      toast({
        title: "Failed to update primary account",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    setDeletingId(accountId);
    try {
      const { error } = await supabase
        .from("microsoft_tokens")
        .delete()
        .eq("id", accountId);

      if (error) throw error;

      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      toast({ title: "Account disconnected" });
    } catch (error) {
      toast({
        title: "Failed to disconnect account",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="h-full bg-muted/30">

      <ScrollArea className="h-full">
        <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Profile</CardTitle>
              </div>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                    {user?.email?.slice(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.user_metadata?.full_name || "User"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              {/* Role Badges */}
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2">Your Roles</p>
                <div className="flex flex-wrap gap-2">
                  {isRolesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Badge variant={isAdmin ? "default" : "secondary"} className="gap-1">
                        <Shield className="h-3 w-3" />
                        {isAdmin ? "Admin" : "Member"}
                      </Badge>
                      {entityRoles.map((role) => (
                        <Badge key={role.id} variant="outline" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {role.entity_role?.name}
                        </Badge>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Accounts Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Email Accounts</CardTitle>
                    <CardDescription>Connect your Microsoft accounts to access emails</CardDescription>
                  </div>
                </div>
                <Button onClick={handleConnectAccount} disabled={connecting} className="gap-2">
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Mail className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No email accounts connected yet
                  </p>
                  <Button onClick={handleConnectAccount} disabled={connecting} variant="outline" className="gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 21 21">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                    Connect Microsoft Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border">
                          <svg className="h-5 w-5" viewBox="0 0 21 21">
                            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {account.display_name || account.microsoft_email || "Microsoft Account"}
                            </p>
                            {account.is_primary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {account.microsoft_email || "Email not available"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!account.is_primary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimary(account.id)}
                            className="gap-1"
                          >
                            <Star className="h-4 w-4" />
                            Set Primary
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              disabled={deletingId === account.id}
                            >
                              {deletingId === account.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Disconnect account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove access to {account.microsoft_email || "this Microsoft account"}. 
                                You can reconnect it anytime.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAccount(account.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Section */}

          {/* Security Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>
              <Separator />
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
