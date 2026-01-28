import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  Archive,
  AlertCircle,
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import type { EmailFolder } from "@/types/email";
import { UserMenu } from "./UserMenu";

interface FolderSidebarProps {
  folders: EmailFolder[];
  selectedFolderId: string;
  onFolderSelect: (folderId: string) => void;
  onComposeClick: () => void;
}

const folderIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  inbox: Inbox,
  drafts: FileEdit,
  sentitems: Send,
  deleteditems: Trash2,
  archive: Archive,
  junkemail: AlertCircle,
};

export function FolderSidebar({
  folders,
  selectedFolderId,
  onFolderSelect,
  onComposeClick,
}: FolderSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header with user menu */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        <span className="font-semibold text-sm">Mail</span>
        <UserMenu />
      </div>

      {/* Compose button */}
      <div className="p-3">
        <Button
          onClick={onComposeClick}
          className="w-full gap-2 bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Email
        </Button>
      </div>

      {/* Folder list */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-0.5 py-2">
          {folders.map((folder) => {
            const Icon = folderIcons[folder.id.toLowerCase()] || Folder;
            const isSelected = selectedFolderId === folder.id;
            const hasChildren = folder.childFolderCount > 0;
            const isExpanded = expandedFolders.has(folder.id);

            return (
              <div key={folder.id}>
                <button
                  onClick={() => onFolderSelect(folder.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    "hover:bg-sidebar-accent",
                    isSelected && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  )}
                >
                  {hasChildren ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFolder(folder.id);
                      }}
                      className="p-0.5 hover:bg-sidebar-border rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                    </button>
                  ) : (
                    <span className="w-4" />
                  )}
                  <Icon className="h-4 w-4 text-sidebar-foreground/70" />
                  <span className="flex-1 truncate text-left">{folder.displayName}</span>
                  {folder.unreadItemCount > 0 && (
                    <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                      {folder.unreadItemCount}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Additional sections */}
        <div className="border-t border-sidebar-border mt-4 pt-4">
          <p className="px-3 text-xs font-medium text-muted-foreground mb-2">
            WORKSPACE
          </p>
          <nav className="space-y-0.5">
            <button className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-sidebar-accent transition-colors">
              <Users className="h-4 w-4 text-sidebar-foreground/70" />
              <span>Contacts</span>
            </button>
            <a 
              href="/settings"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-sidebar-accent transition-colors"
            >
              <Settings className="h-4 w-4 text-sidebar-foreground/70" />
              <span>Settings</span>
            </a>
          </nav>
        </div>
      </ScrollArea>
    </div>
  );
}
