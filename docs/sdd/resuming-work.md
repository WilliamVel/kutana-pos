# Resuming Work on the KUTANA POS

How to pick this project back up in a new session, and where changes belong.

## Current state

Milestone 1 is complete: the frontend runs fully on mock adapters with no
backend. Work from `main`, which carries the whole Milestone 1 history and is the
default branch of the private remote `WilliamVel/kutana-pos`. Milestone 1 was
built as a chain of seven `pr*` branches; those were deleted once review was
declined, and every one of their commits is contained in `main`.

```bash
pnpm install
pnpm --filter web dev      # the demo: inventory, orders, account assignment, pending debts
pnpm test                  # unit/component tests
pnpm --filter web test:e2e # Playwright, real browser
```

The historical milestone-1 plan lives in `docs/sdd/tasks-v1.md`. Current payable
work uses `PersonalAccount` as the account/debt unit; legacy ticket paths remain
only where historical tests or migration notes still need them.

## Starting a new session

Open Claude Code in this directory and state where you are and what you want:

> Continuing the KUTANA POS. Milestone 1 is done. I want design changes.
> Not moving to Milestone 2 yet.

Project context is persisted, and the plan is in `docs/sdd/tasks-v1.md`. You do
not need to re-explain the project.

## Where design changes belong

Every kind of change has exactly one home. This is deliberate — it is what keeps
a visual tweak from turning into an architectural one.

| What you want to change                  | Where it lives                                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Brand colours, the whole palette         | `apps/web/src/design-system/tokens/palette.css` — the **only** file allowed to contain raw hex |
| Buttons, inputs, badges, icons           | `apps/web/src/design-system/atoms/`                                                            |
| Price tags, status pills, line-item rows | `apps/web/src/design-system/molecules/`                                                        |
| How a screen is laid out                 | `apps/web/src/features/<name>/components/`                                                     |

Never put styling in `features/<name>/containers/`. Containers fetch and wire
data; they hold no visual decisions.

If you put something in the wrong place, the lint guards will fail the build.
That is the system working, not the system being difficult.

## Design changes do not need the SDD cycle

SDD (explore -> propose -> spec -> design -> tasks -> apply) exists for changes
in **scope and behaviour**. Moving a button, adjusting spacing, retuning the
palette, relabelling a control: that is direct work.

```bash
git switch -c design/<short-name> main
# make the change, run the tests, commit
```

## Why now is the cheapest time to iterate on the UI

There is no backend yet. A UI change today breaks no API, migrates no table, and
touches no real sales data. Once Milestone 2 lands Postgres and the venue starts
recording real transactions, the same change costs far more.

Iterate on the interface with the business while it is still this cheap.

## The one trap: design change vs. scope change

Ask one question before starting:

**Does this change need data that does not exist yet, or does it only display
existing data differently?**

- _"Make the account-assignment panels wider"_ — display only. Design change.
- _"Show which server took the order on the account summary"_ — needs a field
  that may not be on the screen, or in the model at all. That is scope, and it
  touches the domain.

This distinction already bit once: the product form silently dropped Description
and Cost Price because they were missing from the domain model. The correct fix
was to complete the model, not to shrink the requirement. If a change needs new
data, treat it as scope work rather than styling.

## Guards you must not weaken

Each of these is enforced in CI and each has been proven to fail on a real
violation. Several caught actual bugs. If one blocks you, solve the underlying
problem — never relax the rule.

- `packages/shared` cannot import NestJS, React, `pg`, or perform I/O
- `features/**` cannot import from `adapters/**`
- No raw hex outside `design-system/tokens/`
- No `'CASH'` literal in the domain — payment methods are registry data
- No body-text terracotta token (it fails WCAG AA at body sizes)
- The primary button stays at or above WCAG's large-bold threshold (18.66px)
- `LineItem` never exposes a `ticket_id` — legacy ticket compatibility stays
  isolated from order line items while personal-account allocation owns new
  payable behavior

## Open questions for the business

Neither blocks Milestone 1. Both are worth asking once KUTANA has seen the demo.

- Do personal accounts print as separate physical checks, and in what format?
- Is IVA uniform across products, or per product? (Seeding only — `tax_rate_bp`
  is per-product either way.)
