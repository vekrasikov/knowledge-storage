---
id: saga-pattern

cheat_sheet:
  key_facts:
    - "A saga is a sequence of local transactions across services, with a compensation for each step if any later step fails."
    - "No distributed ACID — each local step commits independently; sagas trade atomicity for availability."
    - "Two styles: orchestration (central coordinator drives steps) vs choreography (services react to events)."
    - "Compensations must be idempotent and commutative with further events (real life is not time-reversible)."
    - "Sagas are eventually consistent — expect interim states visible to queries (reserved but not confirmed, etc.)."
  commands:
    - "temporal operator workflow show --workflow-id=order-saga-123   # Temporal saga state inspection"
  trade_offs:
    headers: [Aspect, Orchestration, Choreography]
    rows:
      - [Coordination, "Central state machine (visible, testable)", "Distributed event flow (coupled via contracts)"]
      - [Coupling, "All services depend on coordinator", "Services coupled via events they emit/consume"]
      - [Visibility, "Easy to inspect saga state", "Need distributed tracing to reconstruct"]
      - [Scalability, "Coordinator can become bottleneck", "Scales with event broker"]
      - [Failure handling, "Explicit compensation workflow", "Implicit via reverse events"]
      - [Best for, "Complex multi-step flows (5+ steps)", "Simple, well-understood event flows (2-3 steps)"]
  pitfalls:
    - "Missing compensation: you can ship a step but not unship it — design compensations before coding the happy path."
    - "Partial compensation: crash mid-compensation leaves system in inconsistent state. Compensations must be retriable."
    - "Compensation semantics mismatch: 'CancelPayment' after money was sent externally — compensation becomes 'IssueRefund', which is a different business operation."
    - "Saga state lost on orchestrator crash: use durable workflow engines (Temporal, Camunda, AWS Step Functions) not plain code."
  interview_questions:
    - "Order saga: Order → Payment → Inventory → Shipping. Payment succeeds, Inventory fails. What happens? Walk through each service's role in the compensation."
    - "Why not use two-phase commit instead of sagas? When might 2PC still be acceptable?"
  extras_markdown: |
    ### Choosing orchestration vs choreography

    Default to **orchestration** for 5+ step sagas or when compensation logic is complex — central state is worth the coupling cost.

    Default to **choreography** for 2-3 step flows with simple events — adding a coordinator is overkill.

    In practice, mature systems often mix: orchestration for critical financial flows (ordering, payments), choreography for notifications and side effects.

visualization:
  type: mermaid
  content: |
    sequenceDiagram
      participant O as Orchestrator
      participant P as Payment
      participant I as Inventory
      participant S as Shipping
      O->>P: ChargePayment
      P-->>O: PaymentConfirmed
      O->>I: ReserveItems
      I--xO: InventoryUnavailable
      O->>P: RefundPayment (compensation)
      P-->>O: PaymentRefunded
      O->>O: saga FAILED
  alt: "Orchestrator drives three steps; inventory fails, orchestrator triggers payment refund compensation, saga ends in failed state."
---

# Overview

Sagas coordinate multi-step business transactions across services that each own their own database. When a logical transaction must span services — place order, charge payment, reserve inventory, arrange shipping — traditional distributed transactions (2PC) don't scale or degrade availability. Sagas trade distributed atomicity for local-transaction availability, plus explicit compensating actions for rollback.

## Why it exists

Microservices own their data. A single logical business transaction often touches 3-5 services, each with its own database. You can't use a database transaction across them. Two-phase commit (2PC) could theoretically coordinate, but it locks all participants until commit and has well-known availability and performance problems at scale — it's why nobody does 2PC in modern distributed systems.

The saga pattern accepts the trade-off: each local step commits independently, producing a local transaction that is immediately visible. If a later step fails, you run *compensating transactions* in reverse order to logically undo the prior steps. This gives you eventual consistency with no distributed locks.

The cost: compensations are not free rollbacks. "Undo payment" is actually "issue refund" — a new business operation with its own constraints and observability. You must design compensations explicitly; they're not automatic.

## How it works

**Orchestration style.** A central orchestrator drives the saga as a state machine. It calls each service in turn; on failure, it runs compensations in reverse. Durable workflow engines like Temporal, Camunda, or AWS Step Functions persist saga state so orchestrator crashes don't lose progress. This style makes saga state visible and testable — you can look up "where is saga #12345?" and get a clear answer.

**Choreography style.** No central coordinator. Each service reacts to events emitted by others. Payment service sees `OrderPlaced`, charges money, emits `PaymentConfirmed`. Inventory sees `PaymentConfirmed`, reserves items, emits `InventoryReserved`. On failure, services emit reverse events (`InventoryReservationFailed`), and prior services react with compensations (`IssueRefund`). This style is loosely coupled but hard to reason about as the flow grows.

**Compensations.** For each forward step, define its compensation. `ChargePayment` ↔ `IssueRefund`. `ReserveItems` ↔ `ReleaseReservation`. `Ship` ↔ well, shipping can't be undone — so the compensation becomes something different (`RequestReturn`), which is a different business process with different SLAs.

## When to use it

- Multi-step business transactions across service boundaries where local atomicity is fine but distributed consistency must be maintained eventually.
- Order/payment/fulfillment flows in e-commerce and fintech.
- Anywhere you'd otherwise reach for 2PC and realize it doesn't fit.

## When not to use it

- Single-service transactions: use local ACID.
- Steps that are genuinely not reversible and whose failure has no business compensation: redesign the flow instead of pretending a saga works.
- Ultra-low latency paths where eventual consistency costs more than it saves (rare).

## Common mistakes

**Skipping compensation design.** Teams build the happy path first, then discover mid-flight that step 3 can't be undone, or that compensating step 2 after step 3 has already emitted a public event is semantically wrong. Always design compensations with the forward step.

**Relying on in-memory orchestrator state.** Your saga is only as durable as your orchestrator's state. Use Temporal, Camunda, or Step Functions; don't hand-roll state machines in application memory.

**Confusing saga failure with technical failure.** A saga that completes with compensation is not a bug — it's a successful business outcome (order rejected cleanly). Monitor saga outcomes by business semantics, not just "did orchestrator crash?"

## Connection to other topics

Sagas typically build on `event-sourcing` (events record saga progression) and `outbox-pattern` (reliable event publishing between steps). Requires `consumer-idempotency` because messages may be redelivered. Pairs with `cqrs` for observable read models showing in-flight saga state.
