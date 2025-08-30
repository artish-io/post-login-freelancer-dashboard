# Completion Invoice Preview + Routing/UI Fix Implementation Plan

## 🎯 Objective
Fix completion-based invoice preview and routing issues while keeping milestone-based flows completely untouched.

## 🔒 Non-negotiable Constraints
1. **Scope**: Apply changes only when `project.invoicingMethod === "completion"`
2. **Do not modify**: payment execution, balances, eligibility math, task approval rules, enums, or API contracts for milestone projects
3. **Storage**: Use hierarchical storage readers/writers only (UnifiedStorageService + invoices hierarchical helpers). No flat data/invoices.json
4. **IDs**: projectId is a string end-to-end. Task IDs remain numeric
5. **Safety**: Add stage-by-stage atomic logs (append-only file) for each route/page touched
6. **Minimalism**: Only make the edits described; no refactors

## 📋 Files to Inspect/Edit

### 1. Fix Zero-Valued Send Invoice Preview (Completion Only)

**Files:**
- `src/app/freelancer-dashboard/projects-and-invoices/invoices/send-invoice/[invoiceNumber]/page.tsx`
- `src/app/api/invoices/generate-for-project/completion/route.ts`
- `@/lib/storage/unified-storage-service` and invoice helpers

**Current State:**
- Send invoice page renders with $0.00 totals and missing milestones despite approved tasks
- Uses basic invoice fetch without completion-specific logic

**Changes:**
- Add completion-specific data fetching logic
- Recompute preview using approved, not-yet-invoiced tasks when invoice has empty milestones
- Use rate calculation: `((project.totalBudget || 0) - (project.upfrontCommitment || 0)) / (project.totalTasks || 1)`
- Add atomic logging to `data/logs/invoice-send-page.log`

**Acceptance:** Completion project with ≥1 approved, uninvoiced tasks shows correct line items and non-zero totals

### 2. Invoice Number Display Formatting (Completion Only)

**Files:**
- `src/app/freelancer-dashboard/projects-and-invoices/invoices/send-invoice/[invoiceNumber]/page.tsx`
- `src/app/api/invoices/generate-for-project/completion/route.ts`

**Current State:**
- Uses long internal invoice numbers like `INV-C-001-1234567890`

**Changes:**
- Add `getDisplayInvoiceId(invoice, commissionerProfile)` function
- Generate human-friendly IDs like `TB-009` (commissioner initials + zero-padded sequence)
- Store as `displayInvoiceId` when writing new invoices
- Display `displayInvoiceId ?? invoiceNumber` in UI

**Acceptance:** New completion invoices display like TB-016; existing ones fall back gracefully

### 3. UI Parity & Missing Client Details

**Files:**
- `src/app/freelancer-dashboard/projects-and-invoices/invoices/send-invoice/[invoiceNumber]/page.tsx`
- `src/app/freelancer-dashboard/projects-and-invoices/invoices/page.tsx` (reference)
- `components/freelancer-dashboard/projects-and-invoices/invoices/invoice-preview/client-details-box.tsx`

**Current State:**
- Send page missing ClientDetailsBox and full address rendering
- Only shows regional snippets instead of complete client information

**Changes:**
- Import and render ClientDetailsBox component used by reference invoice page
- Add `formatAddress(profile)` helper for full address formatting
- Ensure required props are passed (logo, org name, full address, contact email)
- Keep "Send/Back/Download" action buttons unique to send page

**Acceptance:** Send page visually matches reference invoice with client logo and full addresses

### 4. Fix Freelancer Table → Project Page Infinite Load (projectId=0)

**Files:**
- `components/shared/project-summary-table.tsx`

**Current State:**
- Click handler coerces projectId to number, causing projectId=0 navigation
- Results in 403/404 loops on project tracking page

**Changes:**
- Remove Number() coercion in `handleProjectClick` function
- Keep projectId as string throughout navigation
- Add guard: `if (!projectId || typeof projectId !== 'string') { console.warn('[PROJECT_NAV:BAD_ID]', { projectId }); return; }`
- Add atomic logging to `data/logs/project-nav.log`

**Acceptance:** Clicking project from table routes to correct page with string ID (no 0)

### 5. Commissioner Project Tracking → Pay Invoice Button Inactive

**Files:**
- `components/commissioner-dashboard/projects-and-invoices/project-details/project-action-buttons.tsx`
- `src/app/commissioner-dashboard/projects-and-invoices/invoices/pay-invoice/page.tsx`

**Current State:**
- Pay Invoice button not clickable/routing for completion projects
- Button state not properly checking for unpaid completion invoices

**Changes:**
- Enable button when unpaid invoice exists for completion project (hierarchical read)
- Navigate to `../invoices/pay-invoice?invoice=<invoiceNumber>` on click
- Add completion-specific invoice checking logic
- Add log tags `[PAYINV:UI:CLICK]` and `[PAYINV:UI:NAV]`

**Acceptance:** For completion projects with unpaid invoices, button is enabled and routes correctly

### 6. Remove Redundant Toast ("Opening Existing Draft…")

**Files:**
- Generate-invoice success handler on freelancer side
- `src/app/api/invoices/generate-for-project/completion/route.ts`

**Current State:**
- Shows toast even when opening existing draft

**Changes:**
- Return `{ wasExisting: true }` from backend when matching existing draft
- Omit toast and just navigate when `wasExisting: true`
- Show success toast only for new invoice creation

**Acceptance:** No redundant toast when opening existing drafts

### 7. Atomic Logging for API (Completion Only)

**Files:**
- `src/app/api/invoices/generate-for-project/completion/route.ts`
- `src/app/freelancer-dashboard/projects-and-invoices/invoices/send-invoice/[invoiceNumber]/page.tsx`

**Current State:**
- Limited logging for troubleshooting completion-specific issues

**Changes:**
- Add comprehensive logging to:
  - `data/logs/invoice-gen-completion.log`
  - `data/logs/invoice-send-page.log`
- Include stages: START, VALIDATION_FAIL, READ_PROJECT_OK/MISS, READ_TASKS_OK, LIST_INVOICES_OK, FILTER_APPROVED, FILTER_DEDUP, RATE_OK, BUILD_OK, WRITE_OK/FAIL, DONE

**Acceptance:** Detailed logs available for troubleshooting completion invoice flows

## ✅ Milestone Flows Protection

**Explicitly NOT touching:**
- `src/app/api/payments/execute/route.ts`
- `src/app/api/payments/trigger/route.ts`
- `src/app/api/project-tasks/submit/route.ts`
- `src/app/api/invoices/auto-generate/route.ts`
- Any milestone-specific UI components or routing logic

## 🧪 Acceptance Checklist

- [ ] Completion project with ≥1 approved uninvoiced tasks: Generate → 201, navigates to send page, shows milestones and non-zero totals
- [ ] displayInvoiceId appears like TB-016
- [ ] ClientDetailsBox and full addresses render on send page
- [ ] Milestone projects: unaffected (no changed routes/guards)
- [ ] Freelancer project table click no longer emits projectId=0
- [ ] Commissioner "Pay Invoice" button clickable and routes correctly for unpaid completion invoices
- [ ] No references to flat data/invoices.json
- [ ] Logs written at each stage for troubleshooting
- [ ] No redundant "Opening Existing Draft" toast
