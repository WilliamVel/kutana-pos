# Personal Accounts and Pending Debts Specification

## ADDED Requirements

### Requirement: Orders support personal accounts

An order MUST support multiple personal accounts as payable responsibility groups inside the same order.

Each personal account MUST belong to exactly one order.

Each personal account MUST have exactly one owner:

- an identified customer reference; or
- a non-empty free-name label.

#### Scenario: Create account for identified customer

- **Given** an active order
- **And** an existing customer `customer-1`
- **When** an operator creates a personal account for `customer-1`
- **Then** the account is attached to the order
- **And** the account owner is the identified customer

#### Scenario: Create account with free-name label

- **Given** an active order
- **When** an operator creates a personal account labelled `Juan P.`
- **Then** the account is attached to the order
- **And** the account owner is the free-name label `Juan P.`

#### Scenario: Reject account without owner

- **Given** an active order
- **When** an operator creates a personal account without customer and without free-name label
- **Then** the operation is rejected

### Requirement: Line items are allocated to accounts by quantity

The system MUST allocate order line items to personal accounts by quantity only.

The system MUST NOT support arbitrary amount-based splitting in this change.

The total allocated quantity for a line item MUST NOT exceed the sold line-item quantity.

#### Scenario: Allocate partial quantity to one account

- **Given** an order line item with quantity `3`
- **And** a personal account for `customer-1`
- **When** the operator allocates quantity `1` of the line item to that account
- **Then** the account total includes exactly one unit of that line item
- **And** the remaining allocatable quantity is `2`

#### Scenario: Allocate quantities across multiple accounts

- **Given** an order line item with quantity `3`
- **And** personal accounts `A` and `B`
- **When** quantity `1` is allocated to account `A`
- **And** quantity `2` is allocated to account `B`
- **Then** the full line-item quantity is resolved

#### Scenario: Reject over-allocation

- **Given** an order line item with quantity `2`
- **And** quantity `2` is already allocated
- **When** an operator tries to allocate quantity `1` more
- **Then** the operation is rejected

### Requirement: Personal accounts support partial payment

A personal account MUST support multiple payments until its allocated total is covered.

A personal account MUST be considered partially paid when it has received payment greater than zero and less than its allocated total.

#### Scenario: Partially pay an account

- **Given** a personal account with total `1000` cents
- **When** the operator records a payment of `400` cents
- **Then** the account paid amount is `400` cents
- **And** the remaining balance is `600` cents
- **And** the account status is `partially_paid`

#### Scenario: Fully pay an account with multiple payments

- **Given** a personal account with total `1000` cents
- **When** the operator records payments of `400` and `600` cents
- **Then** the remaining balance is `0` cents
- **And** the account status is `paid`

### Requirement: Account balances can become pending personal debt

The system MUST allow an unpaid or partially paid personal account balance to be marked as pending.

For identified customers, marking an account as pending MUST create a debit entry in that customer's debt ledger for the remaining balance.

For free-name accounts, marking pending MUST keep the account as an unlinked pending account and MUST NOT automatically merge it with any customer.

#### Scenario: Identified customer leaves unpaid balance

- **Given** a personal account owned by customer `customer-1`
- **And** the account has total `1000` cents
- **And** the account has paid `400` cents
- **When** the operator marks the account as pending
- **Then** a customer debt debit entry for `600` cents is recorded for `customer-1`
- **And** the account status is `pending`

#### Scenario: Free-name account leaves unpaid balance

- **Given** a personal account owned by free-name `Juan P.`
- **And** the account has remaining balance `600` cents
- **When** the operator marks the account as pending
- **Then** the account appears in unlinked pending accounts
- **And** no customer debt entry is created

### Requirement: Customer debt accumulates across visits

The system MUST maintain identified customer debt as an append-only ledger.

A customer's debt balance MUST be calculated as total debit entries minus total credit entries.

If the same identified customer leaves pending balances from multiple orders, those balances MUST accumulate into one customer debt balance.

#### Scenario: Customer accumulates debt from two visits

- **Given** customer `customer-1` has existing debt of `1000` cents
- **When** another pending account creates a debit of `500` cents
- **Then** the customer's debt balance is `1500` cents

#### Scenario: Customer partially pays pending debt later

- **Given** customer `customer-1` has debt balance of `1500` cents
- **When** a later pending-debts payment records a credit of `600` cents
- **Then** the customer's debt balance is `900` cents

### Requirement: Pending debts are collected without reopening tables

The system MUST provide a pending-debts flow that lets operators collect customer debt without reopening the original table or order.

The pending-debts flow MUST support partial payment.

#### Scenario: Pay customer debt from pending screen

- **Given** customer `customer-1` has debt balance of `1500` cents
- **When** the operator records a debt payment of `500` cents from the pending-debts screen
- **Then** a customer debt credit entry of `500` cents is recorded
- **And** the original order is not reopened
- **And** the remaining customer debt balance is `1000` cents

### Requirement: Unresolved tables enter review

The system MUST prevent silent closure of an order when sold quantities are unresolved.

An order MUST enter review when a close attempt finds unassigned quantities or invalid allocation state.

An order MAY close with pending debt only when every sold quantity is assigned and every account is either paid or pending.

#### Scenario: Close attempt with unassigned quantity

- **Given** an order line item with quantity `3`
- **And** only quantity `2` has been assigned to personal accounts
- **When** the operator attempts to close the order
- **Then** the order enters `in_review`
- **And** the close result identifies the unresolved quantity

#### Scenario: Close order with one pending account

- **Given** every order line item quantity is fully assigned
- **And** one account is paid
- **And** one account is pending
- **When** the operator closes the order
- **Then** the order status becomes `closed_with_pending`

#### Scenario: Close fully paid order

- **Given** every order line item quantity is fully assigned
- **And** every account is paid
- **When** the operator closes the order
- **Then** the order status becomes `paid`
