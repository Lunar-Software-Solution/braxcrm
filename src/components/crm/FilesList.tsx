import { useState, useEffect, useRef } from 'react';
import { Plus, Paperclip, Download, Trash2, FileText, Image, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntityFiles, EntityFile } from '@/hooks/use-entity-files';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { EntityTable } from '@/types/activities';

interface FilesListProps {
  entityTable: EntityTable;
  entityId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return FileIcon;
}

export function FilesList({ entityTable, entityId }: FilesListProps) {
  const [files, setFiles] = useState<EntityFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { listFilesByEntity, uploadFile, deleteFile, getFileUrl } = useEntityFiles();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadFiles = async () => {
    try {
      setLoading(true);
      const data = await listFilesByEntity(entityTable, entityId);
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [entityTable, entityId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !user) return;

    setUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        await uploadFile(entityTable, entityId, file, user.id);
      }
      toast({ title: 'File(s) uploaded successfully' });
      loadFiles();
    } catch (error) {
      toast({
        title: 'Failed to upload file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (file: EntityFile) => {
    try {
      const url = await getFileUrl(file.file_path);
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: 'Failed to download file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (file: EntityFile) => {
    try {
      await deleteFile(file);
      toast({ title: 'File deleted' });
      loadFiles();
    } catch (error) {
      toast({
        title: 'Failed to delete file',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleAddClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading files...</p>
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
      />
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
          <Button size="sm" onClick={handleAddClick} disabled={uploading}>
            <Plus className="h-4 w-4 mr-1" />
            {uploading ? 'Uploading...' : 'Add File'}
          </Button>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">No files yet</p>
            <Button size="sm" variant="outline" onClick={handleAddClick} disabled={uploading}>
              <Plus className="h-4 w-4 mr-1" />
              Add first file
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => {
              const Icon = getFileIcon(file.mime_type);
              const canDelete = file.uploaded_by === user?.id;
              
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size)} • {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
