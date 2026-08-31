# Proposal: Personal accounts and pending customer debts

## Problem

Business clarified that a restaurant order can be split into multiple personal accounts assigned to customers. Some customers may not pay at the table. Those unpaid amounts must remain as personal debt that can be collected later from a separate pending-debts screen, without reopening the original table.

The current milestone-1 model supports split bills by moving whole line-item allocations between tickets. It does not model:

- customer-identifiable accounts inside an order;
- quantity-level assignment of one line item across accounts;
- personal debt that survives table closure;
- later partial payments against accumulated customer debt;
- unlinked/free-name pending accounts that can later be linked to a real customer.

## Goals

- Let an order contain multiple personal accounts.
- Let each personal account be assigned either to a real customer or to a free-name label.
- Allocate sold quantities, not money amounts, from order line items to personal accounts.
- Allow partial and full payment of each personal account.
- Allow unpaid personal account balances to become pending personal debt.
- Aggregate debt across visits for identified customers.
- List and collect pending debts from a separate screen without reopening a table.
- Preserve an explicit review state when a table has unresolved consumption.

## Non-goals

- No amount-based item splitting yet.
- No backend/Postgres implementation in this change.
- No invoicing, receipt printing, tax reporting, or external customer identity integration.
- No authentication/authorization model for who can forgive or adjust debt.
- No destructive migration plan yet; this is domain design only.

## Business decisions captured

- A pending debt can be paid later from another screen without reopening the table.
- Partial payment is allowed for pending debt.
- Splitting is by quantity only, not by arbitrary amount.
- Customers can be real reusable records, but free-name accounts must remain possible.
- If a customer with existing debt consumes again and leaves another pending balance, the new debt accumulates with the existing balance.
- A table with unresolved items should enter a review state instead of closing silently.
- Pending debt is personal customer debt, not merely an operational table balance.

## Expected impact

This change affects the domain foundation for ordering, billing, payments, and future persistence. The existing `Ticket`/`Allocation` model should either evolve into personal accounts or be wrapped by a new account model. Implementation should be planned as a separate work slice after this design is approved.
