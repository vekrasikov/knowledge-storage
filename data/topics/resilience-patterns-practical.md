---
id: resilience-patterns-practical

cheat_sheet:
  key_facts:
    - "Four core patterns: bulkheads (isolation), timeouts (bounded waits), retry with jitter, rate limiting (backpressure)."
    - "Exponential backoff alone causes thundering herd — always add random jitter."
    - "Timeouts must propagate: an inner call's timeout must be shorter than the caller's timeout."
    - "Retry only on transient errors (5xx, network, timeout). Never retry 4xx — it won't change."
    - "Rate limiting at the edge (client/gateway) protects the producer; at the target protects the dependency."
  commands:
    - "resilience4j.circuitbreaker.instances.myservice.slidingWindowSize=100   # Resilience4j config key"
  trade_offs:
    headers: [Strategy, Latency impact, Failure behaviour, When it's right]
    rows:
      - [No retry, None, "Fail fast, user sees error", "Non-critical reads"]
      - [Fixed interval retry, Adds retry_count × interval, "Synchronized retries can storm", "Batch jobs, low concurrency"]
      - [Exponential backoff, "Grows geometrically", "Still synchronizes if all clients hit at once", "Single-client scenarios"]
      - [Exponential + jitter, "Randomized, predictable bound", "Spreads load, no thundering herd", "Default for production retries"]
  pitfalls:
    - "Retry storm: dependency recovers, thousands of synchronized clients retry at once, takes it down again."
    - "Unbounded retry budget: retries amplify load 2-10× during incidents — cap at 3-5 attempts max."
    - "Circuit breaker with no half-open probing: breaker stays open forever even after recovery."
    - "Timeout on the outer call > sum of inner timeouts + retries: outer abandons while retries still running."
  interview_questions:
    - "A service is degrading under load. Walk me through which resilience patterns you'd add and in what order."
    - "Explain the difference between a bulkhead and a circuit breaker. When would you use each?"
  extras_markdown: |
    ### Order of operations for a new dependency call
    1. Set a timeout (always — default library timeouts are usually too long).
    2. Add retry with exponential backoff + jitter for transient errors only.
    3. Wrap in circuit breaker to short-circuit when dependency is clearly down.
    4. Add bulkhead (thread pool or semaphore) to isolate this dependency's failures from others.
    5. Add rate limiter if you're the source of significant load.

capacity_planning:
  inputs:
    - { name: "Target RPS to dependency", value: "1000", unit: "req/s" }
    - { name: "Dependency SLA latency (p99)", value: "500", unit: "ms" }
    - { name: "Retry multiplier (worst case)", value: "3", unit: "" }
    - { name: "Safety margin", value: "1.5", unit: "" }
  formulas:
    - "ConcurrencyNeeded = RPS × latency × retry_multiplier × safety"
    - "RateLimit = target RPS × safety (enforced at ingress)"
  worked_example: |
    ConcurrencyNeeded = 1000 × 0.5s × 3 × 1.5 ≈ 2250 concurrent requests (bulkhead / thread pool size)
    RateLimit = 1000 × 1.5 = 1500 req/s (to survive short bursts)
  numbers_to_memorize:
    - "Typical retry budget: 3-5 attempts max (after that, fail the operation)"
    - "Jitter window: ± 30-50% of computed backoff (prevents sync)"
    - "Circuit breaker half-open probe frequency: 5-30s after trip"

visualization:
  type: mermaid
  content: |
    sequenceDiagram
      participant C as Client
      participant B as Circuit Breaker
      participant D as Dependency
      C->>B: request
      alt Circuit CLOSED
        B->>D: forward (timeout=500ms)
        D-->>B: OK
        B-->>C: OK
      else Circuit OPEN
        B-->>C: fail fast (no call)
      else Dependency timeout
        D--xB: timeout
        B->>B: wait backoff + jitter
        B->>D: retry (attempt 2 of 3)
      end
  alt: "Sequence showing client call through circuit breaker to dependency, with timeout triggering retry with jitter or circuit-open fast-fail."
---

# Overview

Resilience in distributed systems is not a single feature — it's a stack of complementary patterns that each solve one failure mode. The four core patterns (bulkheads, timeouts, retry with jitter, rate limiting) only work when layered together. Each alone is insufficient; skipping any of them leaves a specific failure mode uncovered.

## Why these patterns exist

Every remote call has three failure modes: slow (takes too long), wrong (returns error), or overwhelming (you make too many). The resilience patterns address each:

- **Slow** → timeouts (bounded wait) + circuit breakers (short-circuit when the dependency is clearly unhealthy)
- **Wrong** → retry with backoff + jitter (for transient errors; never for 4xx)
- **Overwhelming** → rate limiting (protect the dependency) + bulkheads (isolate failure impact)

Without timeouts, one slow dependency blocks your threads. Without retries, transient blips become user-visible failures. Without jitter, retry storms kill a recovering dependency. Without bulkheads, a slow dependency consumes your entire thread pool. Without rate limiting, you're a noisy neighbor.

## How it works — end to end

**Timeouts first.** Set one on every remote call. Default library timeouts (often minutes) are almost never right. Common starting point: p99 dependency latency + 50% headroom.

**Retry, but only for the right errors.** Retry transient network errors, timeouts, 5xx. Never retry 4xx (the error won't change; you'll just amplify load). Use exponential backoff (e.g. 100ms, 200ms, 400ms) with jitter (randomize ± 30-50%).

**Circuit breaker.** When failures exceed a threshold (say 50% of last 20 calls), trip the breaker open — new calls fail immediately without hitting the dependency. This gives the dependency breathing room to recover. After a cooldown (5-30s), let one request through as a half-open probe.

**Bulkhead.** Isolate each dependency in its own thread pool or semaphore. When dependency X is slow, only threads calling X are blocked — threads calling Y, Z continue working. This is what stops one bad dependency from cascading into a full service outage.

**Rate limiting.** Enforce a maximum RPS to any dependency. This caps the damage you can do during incidents (cf. "every retry policy becomes a DDoS policy eventually").

## When to use all four vs. a subset

Always add timeouts + retry with jitter — the cost is near-zero and the protection is real. Add circuit breakers for calls to dependencies you don't fully control. Add bulkheads when you have multiple critical dependencies and can't afford one to bring down the others. Add rate limiting whenever you're a meaningful fraction of a dependency's capacity.

## Common mistakes

The **retry storm** is the classic: a dependency goes down, thousands of clients retry with the same exponential schedule, they all hit the dependency at the same moments as it tries to recover, and keep it down. Jitter exists specifically to fix this — without randomization, exponential backoff synchronizes clients.

The **timeout propagation** mistake is more subtle: inner service has a 30s timeout, middle service has a 10s timeout, outer has 5s. When the inner call takes 20s, the middle service has already been abandoned by outer at 5s, and keeps waiting for another 25s for a response nobody is listening for. Always: outer timeout ≥ sum of inner timeouts + retry delays.

## Connection to other topics

Depends on `sd-failure-modes` (understanding how distributed systems fail). Enables `deployment-strategies` (canary deploys rely on fast failure detection). Pairs with `api-gateway` and `service-mesh` — those platforms often implement these patterns for you.
