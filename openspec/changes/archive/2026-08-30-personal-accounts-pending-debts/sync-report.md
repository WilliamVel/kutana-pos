```yaml
schema: gentle-ai.sync-report/v1
change: personal-accounts-pending-debts
status: completed
mode: archive_time_sync_fallback
canonical_specs:
  - openspec/specs/personal-accounts/spec.md
source_specs:
  - openspec/changes/personal-accounts-pending-debts/specs/personal-accounts/spec.md
requirements:
  added: 7
  modified: 0
  removed: 0
destructive_changes: false
```

# Sync Report: Personal accounts and pending customer debts

## Status

Completed via parent-approved archive-time sync fallback because no prior `sync-report.md` was present.

## Domains synced

- `personal-accounts`: copied `openspec/changes/personal-accounts-pending-debts/specs/personal-accounts/spec.md` to new canonical spec `openspec/specs/personal-accounts/spec.md`.

## Requirement operations

### ADDED

- Orders support personal accounts
- Line items are allocated to accounts by quantity
- Personal accounts support partial payment
- Account balances can become pending personal debt
- Customer debt accumulates across visits
- Pending debts are collected without reopening tables
- Unresolved tables enter review

### MODIFIED

- None

### REMOVED

- None

## Destructive merge guard

No destructive merge was performed. The canonical `personal-accounts` spec did not exist before this fallback sync.

## Same-domain active change warning

No other active OpenSpec change touched `personal-accounts`.
