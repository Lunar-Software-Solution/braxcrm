
# Fix Email Category Classification for Supplier Assignment

## Problem Analysis
The email "Re: Q4 Financial Report Review" from Sarah Thompson is being linked to the wrong entity type (or no entity). Based on investigation:

1. **The assign_entity rules are working correctly** - 3 Suppliers have been created and linked via the "Process Invoices" rule
2. **The issue is the AI classification** - The email needs to be classified under "Invoices & Billing" category to trigger the Supplier assignment
3. **If classified incorrectly** (e.g., as "Partnership & Collaboration"), it would assign an Influencer instead

## Root Cause
The AI classification (Gemini Flash) is categorizing financial/accounting emails like "Q4 Financial Report Review" under a different category rather than "Invoices & Billing".

## Solution Options

### Option A: Improve Category Descriptions (Recommended)
Update the "Invoices & Billing" category description to explicitly include financial reports, accounting documents, and budget reviews so the AI classifies them correctly.

**Changes:**
- Update `email_categories` table to enhance the "Invoices & Billing" description
- Add keywords like: "financial reports", "quarterly reports", "budget review", "accounting"

### Option B: Create a New Category
Create a separate "Financial Reports" category with its own rule that assigns Suppliers.

### Option C: Add Manual Entity Assignment
Add a UI feature to manually link/unlink entities from the email preview panel (for cases where AI classification is incorrect).

---

## Technical Implementation (Option A)

### 1. Update Category Description
Update the "Invoices & Billing" category description to improve classification accuracy:

**SQL Update:**
```sql
UPDATE email_categories 
SET description = 'Emails related to invoices, receipts, payment confirmations, billing statements, financial reports, quarterly reports (Q1/Q2/Q3/Q4), budget reviews, accounting documents, expense reports, and payment requests. Look for attachments with financial data, PDF invoices, or monetary amounts.'
WHERE name = 'Invoices & Billing';
```

### 2. Re-process the Email
After updating the category, trigger re-classification for emails that should be Invoices but were miscategorized.

---

## Why This Matters
- The `assign_entity` action only runs when an email matches the category's rule
- "Process Invoices" rule is tied to "Invoices & Billing" category
- If AI classifies the email to a different category, the wrong (or no) entity assignment happens

## Next Steps After Fix
1. Apply the category description update
2. Manually re-classify the specific email OR wait for new similar emails to verify
3. Consider adding manual entity linking UI for edge cases
