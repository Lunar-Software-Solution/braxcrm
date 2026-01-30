import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Tag, Plus, Trash2, Loader2, Pencil, X, Check, Settings as SettingsIcon } from "lucide-react";
import { useEmailTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/use-email-rules";

const TAG_COLORS = [
  "#6366f1", "#ec4899", "#22c55e", "#f97316", "#3b82f6", 
  "#8b5cf6", "#f59e0b", "#0891b2", "#64748b", "#ef4444"
];

export default function Settings() {
  const { data: tags = [], isLoading } = useEmailTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
    setNewTagName("");
    setNewTagColor(TAG_COLORS[0]);
    setIsCreating(false);
  };

  const handleUpdateTag = async (id: string) => {
    if (!editName.trim()) return;
    await updateTag.mutateAsync({ id, name: editName.trim(), color: editColor });
    setEditingId(null);
  };

  const startEditing = (tag: { id: string; name: string; color: string }) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || TAG_COLORS[0]);
  };

  return (
    <div className="h-full bg-muted/30">
      <ScrollArea className="h-full">
        <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>

          {/* Tags Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle>Email Tags</CardTitle>
                    <CardDescription>Create and manage tags for email organization</CardDescription>
                  </div>
                </div>
                {!isCreating && (
                  <Button onClick={() => setIsCreating(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Tag
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Create Tag Form */}
              {isCreating && (
                <div className="mb-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3 mb-3">
                    <Input
                      placeholder="Tag name..."
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateTag();
                        if (e.key === "Escape") setIsCreating(false);
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || createTag.isPending}
                    >
                      {createTag.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Color:</span>
                    <div className="flex gap-1">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          className={`w-6 h-6 rounded-full border-2 transition-transform ${
                            newTagColor === color ? "border-foreground scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tags List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <Tag className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-4">
                    No tags created yet
                  </p>
                  {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create your first tag
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors"
                    >
                      {editingId === tag.id ? (
                        <div className="flex items-center gap-3 flex-1">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 max-w-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdateTag(tag.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <div className="flex gap-1">
                            {TAG_COLORS.map((color) => (
                              <button
                                key={color}
                                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                                  editColor === color ? "border-foreground scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                                onClick={() => setEditColor(color)}
                              />
                            ))}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateTag(tag.id)}
                            disabled={!editName.trim() || updateTag.isPending}
                          >
                            {updateTag.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <Badge
                              style={{ backgroundColor: tag.color || "#6366f1" }}
                              className="text-white"
                            >
                              {tag.name}
                            </Badge>
                            {tag.outlook_category && (
                              <span className="text-xs text-muted-foreground">
                                Outlook: {tag.outlook_category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditing(tag)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete tag?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove the "{tag.name}" tag. Emails with this tag will no longer have it applied.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteTag.mutate(tag.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}