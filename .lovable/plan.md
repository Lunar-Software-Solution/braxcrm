

# Plan: Remove Redundant `link_entity` Action

## Overview
Now that Person/Sender and Entity record creation happens automatically in `prepare-for-rules` when the user clicks "Send to Rules", the `link_entity` action in `process-entity-rules` is redundant and can be removed.

---

## Current State
- Auto-creation and linking now happens in `prepare-for-rules` (before rules processing)
- `link_entity` action case exists in `process-entity-rules/index.ts` but is marked as "mostly redundant"
- No `link_entity` actions currently exist in the database
- `link_entity` is not exposed in the UI (not in `ENTITY_ACTION_AVAILABILITY`)

---

## Changes

### Step 1: Remove `link_entity` from Edge Function
**File:** `supabase/functions/process-entity-rules/index.ts`

Remove the following:
1. The `case "link_entity":` block in the `processAction` switch statement (lines 800-804)
2. The `handleLinkEntity` function (lines 880-1015)

This reduces the function by ~135 lines of now-unused code.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/process-entity-rules/index.ts` | Remove `link_entity` case and `handleLinkEntity` function |

---

## Summary
This is a cleanup task that removes dead code. The linking functionality now lives in `prepare-for-rules` and runs before emails reach the rules processing queue, making this action type unnecessary.

