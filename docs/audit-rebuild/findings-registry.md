# Audit Findings Registry

This file owns evidence-backed findings and their lifecycle. A finding is not closed
by confidence or a proposed fix; closure requires the stated validation evidence.

## P0 Findings

### F-OPS-HIGH-001: Raw audit evidence was not excluded from Git

- Domain: operations/privacy
- Severity: High
- Frequency: every audit capture before mitigation
- Impact: raw screenshots, metrics, private context, or sealed Fable output could be
  staged accidentally
- Evidence: `EV-P0-CMD-004`; pre-fix `git check-ignore` returned no rule
- Root cause: `.gitignore` protected checkpoint artifacts but not
  `output/audit-rebuild/`
- Action: added the exact `output/audit-rebuild/` ignore boundary before evidence
  capture
- Validation: `git check-ignore -v` resolves the new rule and raw evidence remains
  absent from tracked-source diffs
- Status: `CLOSED_FOR_P0`
- Closure evidence: G0 gate report

### F-SYNC-CRITICAL-001: Unguarded local app boot can contact production sync

- Domain: sync/isolation
- Severity: Critical
- Frequency: every ordinary app boot while online
- Impact: audit interactions can read, merge, or write the shared production dataset
- Evidence: `src/sync.js` hardcodes the production Worker; `src/components/App.jsx`
  starts boot sync and periodic sync; `EV-P0-CMD-004` observed three intercepted
  requests during isolation proof
- Root cause: no environment-specific sync adapter or production-endpoint guard
- P0 containment: committed Vite head-prepend guard intercepts the exact production
  Worker origin and substitutes an in-memory fixture before React loads
- Validation: DOM marker `tradevault-audit-mode=isolated`, intercepted request count,
  and unchanged tracked application-source diff
- Status: `MITIGATED_FOR_AUDIT_OPEN_FOR_PRODUCT`
- Full owner phase: P6 contract/sync audit, P10 prototype architecture, P11 guard
  implementation
- Reopen trigger: any automated workflow begins without asserting the isolation
  marker, or any request reaches the production Worker

## Status Vocabulary

- `OPEN`: evidenced and unresolved
- `MITIGATED_FOR_AUDIT_OPEN_FOR_PRODUCT`: contained for safe audit execution but not
  repaired in the product
- `EXPERIMENT_REQUIRED`: a controlled comparison is needed
- `DEFERRED`: explicitly outside the current program with a decision ID
- `CLOSED_FOR_P{N}`: validated against the phase's stated scope
- `REOPENED`: later evidence contradicted closure
