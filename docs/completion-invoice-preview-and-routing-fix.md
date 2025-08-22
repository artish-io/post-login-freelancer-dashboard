# Completion Invoice Preview & Routing Fix Implementation Guide

## 🎯 Objective
Fix completion-based invoice preview/data flow and routing issues while maintaining all milestone-based flows and payment execution logic unchanged.

## 🔍 Current Failure Points

### A. Send Invoice Page Issues
- **Next.js params error**: Using old sync params API instead of async params
- **Zero values**: Missing completion-specific milestone recomputation logic
- **Wrong invoice opened**: Navigation uses hardcoded or incorrect invoice numbers
- **Missing client details**: ClientDetailsBox not rendering with full addresses

### B. Commissioner Pay Invoice Page Issues
- **Zero values**: Same missing completion-specific logic as send page
- **Data loading**: Not properly handling completion project milestone rebuilding

### C. Generate → Navigate Issues
- **Wrong invoice opened**: Fallback logic opens TB-001 instead of actual generated invoice
- **Redundant toasts**: "Opening Existing Draft" shown unnecessarily

### D. Server/Client Boundary Issues
- **fs import errors**: Storage modules being imported in client components
- **Duplicate guards**: Multiple conflicting validation checks blocking valid operations

## 📋 Files to Inspect & Edit

### Core Pages (Server Components)
- `src/app/freelancer-dashboard/projects-and-invoices/invoices/send-invoice/[invoiceNumber]/page.tsx`
- `src/app/commissioner-dashboard/projects-and-invoices/invoices/pay-invoice/page.tsx`
- `src/app/freelancer-dashboard/projects-and-invoices/invoices/page.tsx` (reference UI)

### Navigation & Actions
- `src/app/freelancer-dashboard/projects-and-invoices/projects/project-details/project-action-buttons.tsx`

### Storage & Utilities
- `src/lib/storage/unified-storage-service.ts`
- `src/lib/fs-json.ts`
- `src/lib/storage/invoices-hierarchical.ts` (if exists, or create)

### Optional API
- `src/app/api/invoices/log/write/route.ts` (new, for preview caching)

## 🔧 Exact Fix Approach

### A. Send Invoice Page Fixes

**1. Next.js Params Error**
```typescript
// ❌ Old (sync)
export default function SendInvoicePage({ params }: { params: { invoiceNumber: string } })

// ✅ New (async)
export default async function SendInvoicePage({ params }: { params: Promise<{ invoiceNumber: string }> }) {
  const { invoiceNumber } = await params;
}
```

**2. Server-Side Data Loader**
- Load invoice by invoiceNumber (hierarchical storage)
- Load project & tasks by invoice.projectId
- For completion projects with empty milestones, recompute:
  - Approved statuses: `['approved', 'completed', 'done', 'approved_by_commissioner']` or `approvedAt` truthy
  - Pool calculation: `max((project.totalBudget || 0) - (project.upfrontCommitment || 0), 0)`
  - Rate per task: `pool / (project.totalTasks || approvedTasks.length || 1)`
  - Build milestones from approved & not-yet-invoiced tasks

**3. Full Addresses & Client Box**
- Render ClientDetailsBox with formatAddress() helper
- Pull full address fields: street, city, region, postal, country

**4. Display ID vs Internal ID**
- Keep invoice.invoiceNumber as canonical
- Compute display ID (TB-017) from commissioner initials + sequence
- Never hardcode invoice numbers

### B. Commissioner Pay Invoice Page Fixes
- Mirror server loader logic from send page
- Same completion-specific recomputation
- Keep existing UI unchanged

### C. Generate → Navigate Fixes
- Use exact invoiceNumber from API response
- Remove TB-001 fallback logic
- Proper navigation: `router.push(\`/send-invoice/${encodeURIComponent(invoiceNumber)}\`)`
- Remove redundant "existing draft" toast

### D. Server-Only Boundaries
- Add `import 'server-only';` to storage modules
- Ensure no fs imports in client components
- Server pages fetch data, pass props to client action components

## 🛡️ Constraints (DO NOT CHANGE)

1. **Scope**: Only completion projects (`project.invoicingMethod === "completion"`)
2. **No hardcoding**: Never hardcode invoice numbers like TB-001
3. **Hierarchy only**: Use hierarchical storage, no flat data/invoices.json
4. **ID rules**: projectId stays string, taskId stays numeric
5. **Guards**: Remove duplicates, keep single source of truth
6. **Client/Server**: No fs imports in client components
7. **Minimal edits**: Only change files/sections needed

## ✅ Acceptance Tests

### 1. Send Invoice Page
- [ ] No "await params" error, page loads server-side
- [ ] Completion projects show non-zero totals and correct milestones
- [ ] ClientDetailsBox renders with full addresses
- [ ] Display ID (TB-017) shows correctly, not hardcoded

### 2. Pay Invoice Page
- [ ] Loads without refresh
- [ ] Shows correct totals for completion projects
- [ ] Same invoice data as send page

### 3. Generate → Navigate
- [ ] Uses actual invoiceNumber from API response
- [ ] No TB-001 fallback
- [ ] No redundant "existing draft" toast

### 4. Technical
- [ ] No fs import errors in browser
- [ ] All storage modules are server-only
- [ ] Milestone projects remain unchanged

### 5. Data Flow
- [ ] Hierarchical storage used throughout
- [ ] Atomic logging to data/logs/invoice-send-page.log and data/logs/invoice-pay-page.log
- [ ] Completion-specific logic properly scoped

## ✅ Implementation Completed

### 1. Fixed Next.js Params Error
- ✅ Updated send invoice page to use `Promise<{ invoiceNumber: string }>` for Next.js 15 compatibility
- ✅ Fixed async params handling with `const { invoiceNumber } = await params;`

### 2. Fixed Invoice Number Generation
- ✅ Updated completion API to generate human-friendly invoice numbers (TB-017 format) as the primary invoiceNumber
- ✅ Removed hardcoded display ID logic that was returning "001"
- ✅ Invoice numbers now use commissioner initials + sequence from actual invoice count

### 3. Server-Side Data Loading
- ✅ Both send and pay invoice pages use server-side data fetching
- ✅ Completion-specific milestone recomputation logic implemented
- ✅ Proper rate calculation: `pool / (project.totalTasks || approvedTasks.length || 1)`
- ✅ Atomic logging to data/logs/invoice-send-page.log and data/logs/invoice-pay-page.log

### 4. Server/Client Boundary
- ✅ Server-only imports already in place for storage modules
- ✅ Pages are Server Components, client actions separated
- ✅ No fs imports in client components

### 5. Navigation Flow
- ✅ Project action buttons already use exact invoiceNumber from API response
- ✅ No hardcoded TB-001 fallbacks
- ✅ Proper navigation with encodeURIComponent

## 📝 Key Changes Made

1. **Send Invoice Page**: Fixed async params, removed hardcoded display ID
2. **Completion API**: Generate human-friendly invoice numbers as primary ID
3. **Data Loading**: Server-side completion-specific logic already implemented
4. **Invoice Numbers**: Use actual generated numbers (TB-017) instead of hardcoded values
