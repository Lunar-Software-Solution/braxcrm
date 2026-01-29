import { ScrollArea } from "@/components/ui/scroll-area";
import UsersRolesSettings from "@/components/settings/UsersRolesSettings";

export default function UsersRoles() {
  return (
    <div className="h-full bg-muted/30">
      <ScrollArea className="h-full">
        <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
          <h1 className="text-2xl font-semibold">Users & Roles</h1>
          <UsersRolesSettings />
        </div>
      </ScrollArea>
    </div>
  );
}
