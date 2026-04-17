---
id: event-sourcing

cheat_sheet:
  key_facts:
    - "Store immutable events as the source of truth; current state is derived by replaying events."
    - "Events are facts about the past (past tense: OrderPlaced, PaymentReceived) — never updated, never deleted."
    - "Projections = read models built by applying events; rebuildable from scratch any time."
    - "Snapshots = periodic state checkpoints to avoid replaying millions of events on every load."
    - "Natural pairing with CQRS: write side appends events; read side maintains query-optimized projections."
  commands:
    - "axonserver --help   # Axon Server: free event store + message router"
  trade_offs:
    headers: [Aspect, Event Sourcing, CRUD state storage]
    rows:
      - [Audit trail, "Complete by construction", "Must be added as separate concern"]
      - [Temporal queries, "Natural (replay up to time T)", "Need history tables / CDC"]
      - [Schema evolution, "Events are versioned; old events stay as-is", "Schema migrations affect all rows"]
      - [Query complexity, "Need projections for each query shape", "Query directly from canonical state"]
      - [Storage cost, "Grows monotonically; no deletes", "Bounded by current state size"]
      - [Team familiarity, "Requires conceptual shift", "Default everyone knows"]
  pitfalls:
    - "Schema evolution of old events — you can't migrate past events, only transform them at read time (upcasters)."
    - "Projection rebuild time grows with event volume — plan snapshotting or per-shard projections early."
    - "Eventual consistency of read models — UI shows stale data briefly after writes; design around it."
    - "Event versioning drift — teams add new fields without coordination, consumers break silently."
  interview_questions:
    - "How would you snapshot an aggregate? What triggers a new snapshot?"
    - "A new feature needs historical data that existing events don't capture. What are your options?"
  extras_markdown: |
    ### When event sourcing earns its cost
    - Domain requires audit (fintech, healthcare).
    - Temporal queries matter ("what was inventory yesterday at 3pm?").
    - Business wants to experiment with new derived views without losing history.
    - Multiple consumers need the same stream (auditing, analytics, notifications).

    ### When it's overkill
    - Simple CRUD with no audit requirement.
    - Small team unfamiliar with the pattern.
    - Strong consistency is mandatory for reads (eventual consistency is a feature of ES).

visualization:
  type: mermaid
  content: |
    sequenceDiagram
      participant U as User
      participant A as Aggregate (Write)
      participant ES as Event Store
      participant P as Projection (Read)
      U->>A: command: PlaceOrder
      A->>A: validate + produce OrderPlaced event
      A->>ES: append OrderPlaced
      ES-->>A: ack
      A-->>U: accepted
      ES->>P: stream event (async)
      P->>P: update read model
      U->>P: query: GetMyOrders
      P-->>U: list from read model
  alt: "Command enters aggregate, which appends events to event store; projection asynchronously consumes events and serves queries from its read model."
---

# Overview

Event sourcing inverts the usual database pattern. Instead of storing current state and losing the history of how it got there, you store the *stream of changes* as immutable facts (events) and derive current state by replaying them. The event log is the source of truth; everything else — current state, read models, analytics — is derived.

## Why it exists

CRUD systems lose information by design. When an order status goes from `placed` to `paid` to `shipped`, each update overwrites the previous state. If the business later asks "how long does it take for orders to go from placed to paid?" you have no answer — the timing is gone. You can bolt on audit tables, history columns, change-data-capture — but these are workarounds for a model that fundamentally discards temporal information.

Event sourcing makes history a first-class citizen. Every state change is an event that stays in the log forever. Want the current state? Replay all events for that aggregate. Want last month's state? Replay up to that timestamp. Want to answer a new analytical question? Build a new projection from the same events.

The pattern originated in accounting, which has been doing this for centuries: a ledger never erases a transaction — you record a new compensating entry.

## How it works

**Write side (aggregate).** A command arrives (`PlaceOrder`). The aggregate validates it against current state (reconstructed from previous events), produces one or more events (`OrderPlaced`, `InventoryReserved`), and appends them to the event store. The events are the commit.

**Event store.** An append-only log. Optimistic concurrency via expected version number: two commands trying to append to the same stream at version 42 — one wins, the other retries with refreshed state.

**Projections (read side).** Independent consumers subscribe to the event stream and maintain denormalized read models optimized for specific queries. When `OrderPlaced` arrives, the "OrdersByUser" projection inserts a row; "OrdersByRegion" updates a counter; "RevenueDaily" aggregates revenue. Each projection is a pure function of events — you can rebuild it from scratch by replaying the log.

**Snapshots.** For aggregates with millions of events (an account active for 10 years), replaying all events on every command is prohibitively slow. Snapshots checkpoint state at known versions: "AggregateState @ version 1000 was X"; the next command only replays from 1000 to current.

## When to use it

Event sourcing shines when audit is a hard requirement (fintech, healthcare, legal), when the business genuinely needs temporal queries ("what was inventory on 2024-03-15 at 10am?"), or when many downstream consumers need the same stream of changes (analytics + ML + notifications + auditing from one source).

## When not to use it

Simple CRUD apps with no audit requirement. Systems where strong read-after-write consistency is mandatory for UX (event sourcing is eventually consistent by design). Teams unfamiliar with the pattern — event sourcing requires genuine conceptual shift, and half-baked implementations are worse than good CRUD.

## Common mistakes

**Treating events as records.** Events should capture *intent* and *business fact* (`ItemShippedToCustomer`), not database operations (`UpdateShipmentRowSetStatusToShipped`). Events live forever; naming them after implementation details traps you.

**No plan for schema evolution.** Old events are immutable. When the event shape changes, you need upcasters — read-time transformations from old event versions to new shapes. If you skip this step early, you hit the "events we can't read anymore" wall quickly.

**Confusing projection latency for bug.** Read models are eventually consistent. A user places an order and hits refresh 50ms later — the projection may not have caught up. Design the UI to handle this (optimistic updates, "processing" states) or accept the latency.

## Connection to other topics

Natural partner of `cqrs` — most real event-sourced systems separate write (aggregates + events) from read (projections). Built atop `outbox-pattern` for reliable event publishing. Consumers rely on `consumer-idempotency` because event replay may re-deliver events.
