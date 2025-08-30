# Fix Send & Pay Invoice Preview Server Boundary Issues

## 🎯 Objective
Fix invoice preview and navigation for completion-based projects by enforcing server-only data access, ensuring correct totals/milestones, and stabilizing navigation.

## 🔍 Root Cause Analysis

### Why fs Error Happens
The current implementation has client components importing storage utilities that transitively import Node.js `fs` module, causing webpack to attempt bundling server-only code for the browser.

**Problem Chain:**
1. `send-invoice/[invoiceNumber]/page.tsx` has `'use client'` directive
2. Imports `UnifiedStorageService` and `getInvoiceByNumber` 
3. These modules import `fs-json.ts` which uses Node.js `fs`
4. Webpack tries to bundle `fs` for client-side, causing build failure

## 📋 Files to Inspect/Edit

### 1. Server Boundary Enforcement
- `src/app/freelancer-dashboard/projects-and-invoices/invoices/send-invoice/[invoiceNumber]/page.tsx`
- `src/app/commissioner-dashboard/projects-and-invoices/invoices/pay-invoice/page.tsx`
- `src/lib/storage/unified-storage-service.ts`
- `src/lib/fs-json.ts`
- `src/lib/invoice-storage.ts`

### 2. Client Component Separation
- Extract interactive elements to separate client components
- Pass computed data as props (no storage imports in client components)

### 3. Navigation Stabilization
- Remove client-side storage imports from navigation handlers
- Add defensive guards and logging

## 🔧 Exact Edits Per Section

### 1. Stop Bundling fs to Client

**Files to modify:**
- Remove `'use client'` from send-invoice and pay-invoice pages
- Add `import 'server-only';` to storage modules
- Split interactive UI into separate client components

### 2. Server Loaders for Correct Preview

**send-invoice/[invoiceNumber]/page.tsx:**
- Convert to Server Component
- Server-side data fetching using hierarchical storage
- Completion-specific milestone rebuilding logic
- Atomic logging to `data/logs/invoice-send-page.log`

**pay-invoice/page.tsx:**
- Same server-side pattern
- Atomic logging to `data/logs/invoice-pay-page.log`

### 3. Stabilize Navigation

**Client navigation handlers:**
- Remove storage imports
- Use API responses for navigation
- Add defensive guards
- Console logging: `[INVGEN:UI:NAVIGATE]`, `[PAYINV:UI:NAVIGATE]`

### 4. Completion-Only Scope

**Branching logic:**
```typescript
if (project.invoicingMethod !== 'completion') {
  // Use existing milestone behavior unchanged
}
```

### 5. UX/Label Fixes

**Display improvements:**
- Human-friendly invoice IDs (TB-009 format)
- ClientDetailsBox with full addresses
- Graceful handling of missing fields

### 6. Atomic Logging Helper

**New file:** `src/lib/logs/append-log.ts`
- Server-only logging utility
- Structured JSON logging with timestamps

## ✅ Implementation Completed

### 1. Server/Client Boundary Enforcement
- ✅ Added `import 'server-only';` to storage modules
- ✅ Converted send-invoice and pay-invoice pages to Server Components
- ✅ Created separate client components for interactive elements
- ✅ Eliminated fs bundling to client-side

### 2. Server-Side Data Loading
- ✅ Implemented server-side invoice, project, and task fetching
- ✅ Added completion-specific milestone rebuilding logic
- ✅ Proper rate calculation for completion projects
- ✅ Fresh data fetching with `cache: 'no-store'`

### 3. Atomic Logging
- ✅ Created `src/lib/logs/append-log.ts` server-only utility
- ✅ Added comprehensive logging to both pages
- ✅ Logs written to `data/logs/invoice-send-page.log` and `data/logs/invoice-pay-page.log`

### 4. Client Components Created
- ✅ `SendInvoiceClientActions` for send invoice interactions
- ✅ `PayInvoiceClientActions` for payment interactions
- ✅ Proper navigation logging with console tags

### 5. Completion-Only Scope
- ✅ All logic properly scoped to `project.invoicingMethod === 'completion'`
- ✅ Milestone projects remain completely unaffected
- ✅ No changes to milestone routes or calculations

## ✅ Acceptance Checks

- ✅ No "Module not found: Can't resolve 'fs'" errors (server/client boundary enforced)
- ✅ Send-invoice page shows non-zero totals for completion projects
- ✅ ClientDetailsBox renders with full addresses using formatAddress utility
- ✅ Pay-invoice page loads immediately without manual refresh
- ✅ Navigation uses proper string IDs and defensive guards
- ✅ Milestone projects remain unaffected
- ✅ No flat data/invoices.json usage (hierarchical storage only)
- ✅ Logs written to specified files with structured JSON format
- ✅ Server/client boundary properly enforced with 'server-only' imports

## 🛡️ Constraints Maintained

1. **Scope:** Limited to invoice preview & navigation, completion projects only
2. **Storage:** Hierarchical readers/writers only
3. **IDs:** projectId remains string, taskId remains numeric
4. **Client/Server:** Proper separation, no fs bundling
5. **Minimal:** Only specified edits, no unnecessary refactors
