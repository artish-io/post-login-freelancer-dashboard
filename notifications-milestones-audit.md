# Milestone‑Based **Payment Notifications** Implementation Guide  
*(Task Approval → Payment Execution → Notifications)*

**Last updated:** 2025‑08‑26

---

## 0) Purpose & Scope

This guide translates the audit findings into a **surgical implementation plan** that:

- **Separates multiple emission paths** so the same payment does not generate duplicate notifications.
- **Restores the missing _freelancer payment_ notification** in milestone‑based projects.
- **Backfills projects** where those notifications were missing or fell back to generic content.
- **Does not break** payments, task approval, gig matching, or any notification flows **unrelated** to post‑approval **payment notifications** for **milestone‑based** invoicing.

> **Out of scope:** payment math, invoicing math, UI components, rating prompts, completion‑based flows (except shared guards), or non‑payment notifications.

---

## 1) Non‑Negotiable Constraints

1. **No schema/enums renames.** No on‑disk format changes.  
2. **No new dependencies.**  
3. **Minimal, localized edits** only in the payment‑notification emission path.  
4. **Completion‑based** approval/payment/matching **must remain unchanged**.  
5. **Task approval** notifications **must remain unchanged**.  
6. **Generic notifications** for non‑payment events must remain available.  
7. **Feature‑flag every change** (see §6 Rollout) to allow instant rollback.  
8. **Emit-time enrichment only**; templates render from payload—**no template‑time reads**.  
9. If enrichment prerequisites are missing, **do not emit**; log a clear reason.

### 1A) Task‑Approval Safety Constraints (Do Not Break Approvals)

These constraints protect **task approval** logic and notifications from any changes made to **payment notifications**:

1. **Do not edit** any task‑approval handlers, routes, emitters, templates, or storage schemas.  
2. **Do not change** approval event types, names, or directories.  
3. **Do not modify** the approval → payment decision logic (guards, state transitions, writes).  
4. All new work must be **isolated to payment‑notification emission** after payment execution.  
5. **Never throw** past the payment‑notification layer. Wrap the payment‑notification entrypoint with an isolation guard:
   ```ts
   try {
     if (process.env.PAYMENT_NOTIFS_DISABLED !== 'true') {
       await emitPaymentNotificationsSafely(payload); // post‑payment only
     }
   } catch (e) {
     devLog('[warn] payment notifs failed, approvals unaffected', e);
     // Intentionally swallow to avoid impacting task approval flow
   }
   ```
6. Add and respect the following **feature flags** (all default **OFF**):
   - `NOTIFS_SINGLE_EMITTER` — routes payment notifications through the gateway (shadow/hybrid/cutover rollout).  
   - `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT` — disables generic payment notifs when the gateway is ON.  
   - `PAYMENT_NOTIFS_DISABLED` — **kill switch**: skip payment notifs entirely; approvals continue unaffected.
7. **Singleton bootstrap guard** for *payment‑notification* handler registration **only** (approval bootstrap untouched):
   ```ts
   if ((globalThis as any).__notifHandlersBootstrapped) return;
   (globalThis as any).__notifHandlersBootstrapped = true;
   registerPaymentNotificationHandlers(); // do not touch approval handlers here
   ```
8. **No template‑time reads** in payment notification renderers. Render from **payload only** to avoid races that might back‑propagate errors.
9. **Observability requirement:** Payment‑notification code must log `[warn] payment notifs failed, approvals unaffected` on any caught error.
10. **Rollback is instant**: flipping the three flags to their defaults reverts behavior with zero effect on task‑approval flows.

### 1B) Invoice Generation & Payment Execution Safety Constraints (Read‑Only)

These constraints ensure **invoice generation** and **payment execution** remain unaffected by payment‑notification changes. Notification code may **read** invoice/payment data for enrichment, but must never mutate them.

1. **Do not edit** any invoice generation code paths, payment execution services, gateways, or their schemas.
2. **No writes** to invoice or payment artifacts from notification code: 
   - No creation/deletion/update of `data/invoices/**` or `data/payments/**` files/records.
   - No state transitions (e.g., paid → refunded) from notification layers.
3. **Read‑only enrichment** only:
   - Invoice lookup must tolerate variants (e.g., map `TXN-<code>` → `<code>`), but **must not** alter filenames or contents.
   - Amount resolution may read `totalAmount | amount | total | grandTotal` or sum line items, but **must not** rewrite values.
4. **Isolation & error handling**:
   - Wrap all invoice/payment reads in try/catch; on failure, **log** and **skip notification emission** rather than affecting generation/execution.
   - Never throw past the notification boundary into payment execution flows.
5. **Feature flags apply** here too:
   - `PAYMENT_NOTIFS_DISABLED=true` must skip notification processing without impacting invoice creation or payment execution.
6. **Observability**:
   - Dev logs must clearly differentiate **read failures** (e.g., `[warn] notif enrichment read failed (invoice/payment) — execution unaffected`).
7. **Acceptance invariant**:
   - Running notifications in shadow/hybrid/cutover modes must not create, delete, or mutate any invoice/payment artifacts; diffs should show **no changes** outside notification event files.

---

## 2) Definitions (Milestone‑Based)

**Events & Audiences**

- **`invoice.paid`**: internal bus signal after a milestone payment executes.  
- **Commissioner** payment notification: **`milestone_payment_sent`**  
  - *Copy shape:* “You just paid {freelancerName} ${amount} …”
- **Freelancer** payment notification: **`milestone_payment_received`**  
  - *Copy shape:* “{organizationName} paid ${amount} …”
- **Generic fallback**: context‑poor “invoice paid” style messages; keep for non‑payment cases, but gate for payment events.

**Canonical key** (idempotency):  
```
eventKey = "{type}:{audience}:{projectId}:{invoiceNumber}"
```
- `type` ∈ { `milestone_payment_sent`, `milestone_payment_received` }  
- `audience` ∈ { `commissioner`, `freelancer` }  
- `projectId` is **string** (e.g., “C‑009”)  
- `invoiceNumber` is **clean** (e.g., “MH‑009”; map from “TXN‑MH‑009”)

---

## 3) Handler Lifecycle (Eliminate Dev/HMR Doubles)

**Goal:** Prevent dev hot‑reload from registering the same handlers twice.

- Wrap handler registration in a **singleton guard** (module‑global or `globalThis` flag).
- On bootstrap, **log once** that handlers registered successfully.
- Do **not** remove legacy paths yet; use **feature flags** in §6.

---

## 4) Single Emission Gateway (Feature‑Flagged)

**Goal:** Centralize idempotency + quality merge **without** refactoring callers.

### Responsibilities
- Normalize identifiers:
  - `projectId = String(projectId).trim()` (no `parseInt`)
  - `invoiceNumber`: strip `TXN-` prefix; if unknown, locate the matching invoice in the project/day folder.
- Build `eventKey` (see §2).
- Evaluate **quality** of incoming vs existing event:

  ```
  qualityScore = (amount>0 ? 2 : 0)
               + (freelancerName && freelancerName!=="Freelancer" ? 1 : 0)
               + (organizationName && organizationName!=="Organization" ? 1 : 0)
  ```

- **Upgrade‑in‑place** policy:
  - If an event with the same `eventKey` exists and `incomingQuality > existingQuality`, **overwrite** title/message/metadata and set `updatedAt`.
  - Else, **skip** and log a `[skip-duplicate]`.

- Persist and **dev‑log**:
  - `[emit] {eventKey} {audience, amount, nameUsed}`
  - `[upgrade-duplicate] {eventKey} {oldQ, newQ}`
  - `[skip-guard] {eventKey} {missingFields}`

### Contract (payload‑only render)
Callers must pass **fully enriched** payloads; renderers may not perform file reads.

---

## 5) Separate Emissions by Audience (Fix Missing Freelancer)

**Goal:** Ensure **both** commissioner and freelancer branches run independently for each milestone payment.

- **Commissioner branch** → emit `milestone_payment_sent`
  - **Requires:** `freelancerName` (non‑generic), `amount > 0`
  - **Message:** “You just paid {freelancerName} ${amount} for submitting {taskTitle} for {projectTitle}. Remaining budget: ${remainingBudget} …”
- **Freelancer branch** → emit `milestone_payment_received`
  - **Requires:** `organizationName` (non‑empty), `amount > 0`
  - **Message:** “{organizationName} has paid ${amount} for your recent {projectTitle} task submission. This project has a remaining budget of ${remainingBudget} …”
- **Do not early‑return** after the first emission. Wrap each branch in its own try/catch so one failure does not block the other.

**Organization name resolution (freelancer branch):**  
1) project.organization.displayName  
2) commissioner.profile.organizationName  
3) commissioner.displayName / name  
4) (last resort) project.commissionerLabel (must be non‑empty)

---

## 6) Enrichment at Emit‑Time (No Template‑Time Reads)

**Normalize identifiers**
- `projectId`: always string.
- `invoiceNumber`: map from payment IDs like `TXN‑MH‑009` → `MH‑009`.

**Resolve amounts**
- Prefer **runtime payment result** amount.  
- Fallback to invoice JSON fields in order: `totalAmount | amount | total | grandTotal`; else **sum** line items (`total | amount | 0`).

**Resolve identities**
- **Freelancer:** project.freelancerId → user index (guard `undefined|null` before `.toString()`).
- **Organization:** use the resolver chain above.

**Build final payloads** and pass into the gateway.  
If required fields are missing → **log `[skip-guard]` and do not emit**.

---

## 7) Quarantine Generic/Fallback Emitters (Without Deleting)

**Goal:** Prevent duplicates for payment events while keeping generics for other flows.

- Add a feature flag `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT` (default **off**).  
- When **on**, block generic payment emitters for keys that the gateway handles.  
- Gateway idempotency still protects against retries/double‑clicks.

---

## 8) Backfill Plan (Make Project Narratives Cohesive)

> **Priority:** Project **C‑009 / MH‑009** then optional global.

### 8.1 C‑009 / MH‑009 Backfill
1. **Locate** enriched commissioner + freelancer events by `eventKey`.  
   - If **freelancer event missing**, **create** it from enriched payload (use payment timestamp or invoice timestamp).  
2. **Upgrade‑in‑place** any fallback copies (amount `0` or generic names).  
3. **Quality‑based cleanup:** keep the highest `qualityScore`; delete poorer duplicates.  
4. Add `enrichmentNote = "Backfilled"` and `updatedAt` for any file changed.

### 8.2 Optional Global Backfill (behind `BACKFILL_ALL_NOTIFS`)
- Walk recent date trees; for each payment:
  - Ensure **both** audience events exist.  
  - Re‑enrich amount/name/org using the same emit‑time resolvers.  
  - Apply quality‑based upgrade/cleanup.  
  - Log a concise summary.

---

## 9) Rollout & Safety (Feature Flags)

**Flags**
- `NOTIFS_SINGLE_EMITTER` — route emits through the gateway (default: **off**)  
- `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT` — block generic payment notifs (default: **off**)  
- `BACKFILL_ALL_NOTIFS` — run global backfill tool (default: **off**)

**Stages**
1. **Shadow:** `NOTIFS_SINGLE_EMITTER=on`, generics **on** → Compare outputs via logs; no user impact.  
2. **Hybrid:** `NOTIFS_SINGLE_EMITTER=on`, `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT=on` → Only gateway emits for payments.  
3. **Cutover:** Keep both flags **on** in prod once stable.

**Rollback:** Flip flags **off** to restore legacy behavior instantly.

---

## 10) Observability

- Emit logs only in local/dev:
  - `[emit] {eventKey}`, `[upgrade-duplicate]`, `[skip-duplicate]`, `[skip-guard]`  
- Add a lightweight **healthcheck** that returns the list of registered handlers (ensure singleton).

---

## 10A) Approval Healthcheck (dev‑only)

Provide a **read‑only** healthcheck function (dev only) that returns:

- `approvalHandlersRegisteredCount` — number of approval handlers observed (read without modifying).  
- `paymentNotifHandlersRegisteredCount` — number of payment‑notification handlers observed.  
- `flags` — current values of `NOTIFS_SINGLE_EMITTER`, `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT`, `PAYMENT_NOTIFS_DISABLED`.

> This function must have **no side effects**; it exists purely to confirm that approval handlers are registered exactly once and that payment‑notification handlers honor the singleton guard.

---

## 11) Acceptance Tests (Must Pass)

1. **Milestone payment on a project with string projectId (e.g., “C‑009”):**  
   - Exactly **one** commissioner notif (enriched), **one** freelancer notif (enriched).  
   - No generic duplicate.  
   - Task‑approval notif still fires.  
   - Completion‑based flows behave unchanged.

2. **Duplicate emission (simulate retry or double‑click):**  
   - Gateway upgrades in place (no extra file).  
   - `[upgrade-duplicate]` appears; final file has enriched values.

3. **C‑009 backfill:**  
   - Freelancer notification exists and is enriched.  
   - Any “Freelancer $0” copies are upgraded or removed.  
   - Commissioner copy remains enriched.

4. **Invoice/Payment Safety:**
   - During tests in shadow/hybrid modes, verify that invoice and payment artifacts (files/records) are **unchanged** — only notification event files may be created/updated.
   - Intentionally induce a read error (e.g., temporarily hide an invoice file) and confirm: notifications log a read failure and **do not** emit, while invoice generation and payment execution proceed unaffected.

---

## 11A) Approval Safety Smoke Tests (5‑Minute Proof)

Run these quick checks locally to prove approvals are safe before cutover:

1. **Baseline Approval (no flags):**  
   - Approve a task. Expect: approval state changes; one approval notification; no payment‑notif changes.

2. **Shadow Mode:** `NOTIFS_SINGLE_EMITTER=on`, `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT=off`  
   - Repeat approval → payment on a milestone project. Expect: approval outputs identical to baseline; gateway logs `[emit]` alongside legacy behavior.

3. **Hybrid Mode:** `NOTIFS_SINGLE_EMITTER=on`, `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT=on`  
   - Approve + pay a milestone task. Expect:  
     - Approval notifications unchanged.  
     - Exactly one commissioner + one freelancer payment notification (enriched).  
     - No generic duplicate.

4. **Kill Switch:** `PAYMENT_NOTIFS_DISABLED=true`  
   - Approve + pay a milestone task. Expect: approval notifications present; **no** payment notifications emitted.

5. **HMR Safety:** Trigger bootstrap twice in dev. Expect:  
   - Approval handler count unchanged.  
   - Payment‑notification handlers register **once** (singleton guard effective).

---

## 12) Rollback Plan

- Turn off `NOTIFS_SINGLE_EMITTER` and `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT`.  
- Because we **did not** remove legacy paths or change schemas, behavior reverts immediately.

---

## 12A) Kill Switch & Rollback Quick Reference

- **Immediate rollback:**  
  - `NOTIFS_SINGLE_EMITTER=off`  
  - `NOTIFS_DISABLE_GENERIC_FOR_PAYMENT=off`  
  - (Optional) `PAYMENT_NOTIFS_DISABLED=true` to temporarily silence payment notifications while approvals continue normally.

- **Invariant:** No changes to approval handlers, templates, or schemas. Approvals remain fully functional regardless of payment‑notification status.

---

## 13) Appendix

### A) Event Key Spec
```
type: 'milestone_payment_sent' | 'milestone_payment_received'
audience: 'commissioner' | 'freelancer'
projectId: string (e.g., 'C‑009')
invoiceNumber: string (e.g., 'MH‑009')
eventKey: `${type}:${audience}:${projectId}:${invoiceNumber}`
```

### B) Quality Score
```
amount>0 ? +2 : +0
freelancerName && freelancerName!=="Freelancer" ? +1 : +0
organizationName && organizationName!=="Organization" ? +1 : +0
Max = 4
```

### C) Payload Examples

**Commissioner (`milestone_payment_sent`)**
```json
{
  "type": "milestone_payment_sent",
  "audience": "commissioner",
  "projectId": "C-009",
  "invoiceNumber": "MH-009",
  "title": "You just paid Tobi Philly $500",
  "message": "You just paid Tobi Philly $500 for submitting Positioning & Messaging for Milestones Web 3 Graphic Design Asssets. Remaining budget: $1,000. Click here to see transaction activity",
  "metadata": {
    "freelancerName": "Tobi Philly",
    "amount": 500,
    "taskTitle": "Positioning & Messaging",
    "projectTitle": "Milestones Web 3 Graphic Design Asssets",
    "remainingBudget": 1000
  }
}
```

**Freelancer (`milestone_payment_received`)**
```json
{
  "type": "milestone_payment_received",
  "audience": "freelancer",
  "projectId": "C-009",
  "invoiceNumber": "MH-009",
  "title": "Corlax Wellness paid $500",
  "message": "Corlax Wellness has paid $500 for your recent Milestones Web 3 Graphic Design Asssets task submission. This project has a remaining budget of $1,000. Click here to view invoice details",
  "metadata": {
    "organizationName": "Corlax Wellness",
    "amount": 500,
    "taskTitle": "Positioning & Messaging",
    "projectTitle": "Milestones Web 3 Graphic Design Asssets",
    "remainingBudget": 1000
  }
}
```

---

**End of Guide**
