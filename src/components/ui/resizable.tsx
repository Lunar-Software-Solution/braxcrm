import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "group relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 hover:bg-accent/30 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 [&[data-panel-group-direction=vertical]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="fixed top-1/2 -translate-y-1/2 z-50 flex h-8 w-4 items-center justify-center rounded-sm border bg-border group-hover:bg-accent/50 transition-colors shadow-sm pointer-events-none">
        <div className="grid grid-cols-2 gap-0.5">
          <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground/60" />
        </div>
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
