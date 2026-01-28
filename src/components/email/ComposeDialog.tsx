import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Paperclip,
  Send,
  X,
  Minimize2,
  Maximize2,
  Bold,
  Italic,
  Underline,
  List,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  replyTo?: {
    to: string;
    subject: string;
    body?: string;
  };
}

export function ComposeDialog({ open, onOpenChange, replyTo }: ComposeDialogProps) {
  const [to, setTo] = useState(replyTo?.to || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState(replyTo?.subject || "");
  const [body, setBody] = useState(replyTo?.body || "");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSend = () => {
    // TODO: Implement send functionality with Microsoft Graph API
    console.log("Sending email:", { to, cc, bcc, subject, body });
    onOpenChange(false);
  };

  const handleDiscard = () => {
    setTo("");
    setCc("");
    setBcc("");
    setSubject("");
    setBody("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-w-2xl p-0 gap-0",
          isMinimized && "h-12 overflow-hidden"
        )}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-3 border-b border-border bg-muted/30">
          <DialogTitle className="text-sm font-medium">New Message</DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              {isMinimized ? (
                <Maximize2 className="h-3.5 w-3.5" />
              ) : (
                <Minimize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </DialogHeader>

        {!isMinimized && (
          <>
            {/* Recipients */}
            <div className="border-b border-border">
              <div className="flex items-center px-3 py-2 gap-2">
                <Label className="w-12 text-sm text-muted-foreground">To</Label>
                <Input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Recipients"
                  className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
                />
                <div className="flex gap-1 text-sm">
                  {!showCc && (
                    <button
                      onClick={() => setShowCc(true)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Cc
                    </button>
                  )}
                  {!showBcc && (
                    <button
                      onClick={() => setShowBcc(true)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Bcc
                    </button>
                  )}
                </div>
              </div>

              {showCc && (
                <div className="flex items-center px-3 py-2 gap-2 border-t border-border">
                  <Label className="w-12 text-sm text-muted-foreground">Cc</Label>
                  <Input
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="Carbon copy"
                    className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
                  />
                </div>
              )}

              {showBcc && (
                <div className="flex items-center px-3 py-2 gap-2 border-t border-border">
                  <Label className="w-12 text-sm text-muted-foreground">Bcc</Label>
                  <Input
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="Blind carbon copy"
                    className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
                  />
                </div>
              )}

              <div className="flex items-center px-3 py-2 gap-2 border-t border-border">
                <Label className="w-12 text-sm text-muted-foreground">Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject"
                  className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
                />
              </div>
            </div>

            {/* Formatting toolbar */}
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-5 bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-3 min-h-[200px]">
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message..."
                className="min-h-[180px] border-0 shadow-none focus-visible:ring-0 resize-none p-0"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Button onClick={handleSend} className="gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
                <Button variant="outline" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" onClick={handleDiscard} className="text-muted-foreground">
                Discard
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
