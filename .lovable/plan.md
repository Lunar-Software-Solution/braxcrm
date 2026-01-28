
# Plan: Implement Flexible Separator Handles Between Sections

## Overview
Enhance the resizable panel dividers in the email layout to display more prominent, always-visible drag handles similar to the reference image. The current implementation uses small centered grip icons, while the desired design shows larger dotted/grid-pattern handles that are visible on hover or always present.

## Technical Approach

### 1. Update the ResizableHandle Component
Modify `src/components/ui/resizable.tsx` to support a more prominent handle style:
- Add a new variant or enhance the existing `withHandle` prop to show a taller, more visible grip pattern
- The handle should span more vertical space (currently only 4 units tall)
- Add hover states for better interactivity feedback
- Use a dotted/grid pattern similar to the reference image

### 2. Style Enhancements
- Increase the height of the grip handle area from `h-4` to something taller (e.g., `h-8` or full height option)
- Add subtle background on hover to indicate the draggable area
- Consider adding a subtle border or shadow to make handles more prominent
- Match the professional enterprise design aesthetic

### 3. Implementation Details

**File: `src/components/ui/resizable.tsx`**

Update the `ResizableHandle` component to:
- Support a wider hit target for easier grabbing
- Show a more prominent visual indicator (6-dot grip pattern instead of current 3-dot)
- Add hover effects that highlight the entire separator region
- Optional: Show handles on hover only vs always visible

Example styling for enhanced handle:
```text
+------------------+
|   Folder Panel   | :: |   Email List   | :: |   Preview    |
+------------------+
                    ^                      ^
              Grip handles with 6-dot pattern
              Visible on hover, larger hit area
```

---

## Technical Details

### Component Changes

**`src/components/ui/resizable.tsx`**
- Modify the handle container from `h-4 w-3` to `h-8 w-3` for taller grip
- Add hover state: `hover:bg-accent/50` to the handle wrapper
- Change the grip pattern to show 6 dots (2 columns x 3 rows) using CSS or nested divs
- Add `group` class to parent for hover-based visibility

### CSS/Styling
- The grip dots will be small circles arranged in a 2x3 grid
- Color: `text-muted-foreground` in default state
- Hover: Slight background highlight and increased opacity

### No Database Changes Required
This is a purely frontend UI enhancement.

---

## Summary of Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/resizable.tsx` | Enhance ResizableHandle with taller grip pattern and hover states |
