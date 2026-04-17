---
id: sd-capacity

cheat_sheet:
  key_facts:
    - "Back-of-envelope estimation trades precision for speed — aim for order-of-magnitude, not exact numbers."
    - "Three dimensions to estimate: QPS (requests/sec), storage (GB), bandwidth (Mbps)."
    - "Peak traffic is typically 2-3× average; design to peak + 20% headroom."
    - "Seconds per day ≈ 10^5 (86,400). Seconds per year ≈ 3.15 × 10^7."
    - "Memory latency: L1 ~1ns, RAM ~100ns, SSD ~100µs, spinning disk ~10ms, cross-AZ network ~500µs, cross-region ~100ms."
  commands:
    - "echo '1000000 * 2 / 86400' | bc   # 1M users × 2 writes/day ≈ 23 writes/sec"
  trade_offs:
    headers: [Choice, When it helps, When it hurts]
    rows:
      - [Pre-compute at write, Read-heavy workloads, "Write amplification; storage cost"]
      - [Compute at read, Write-heavy or rarely-read data, "Read latency; repeated work"]
      - [Cache result, "Read ≫ write, tolerable staleness", "Invalidation complexity; memory cost"]
  pitfalls:
    - "Ignoring peak-to-average ratio — system sized for average crashes during traffic spikes."
    - "Forgetting replication factor when sizing storage (3× for typical distributed DB)."
    - "Treating bandwidth as infinite — 1 Gbps = ~125 MB/s, large payloads saturate NICs quickly."
  interview_questions:
    - "Estimate the QPS for Twitter timeline generation. Walk me through your assumptions."
    - "How does the estimate change if 10% of users are power users generating 90% of traffic?"
  extras_markdown: |
    ### The 5-minute estimation recipe
    1. State assumptions explicitly (DAU, per-user action rate, payload sizes).
    2. Compute average QPS = total actions/day ÷ 86,400.
    3. Multiply by peak factor (2-3×) for peak QPS.
    4. Storage = (items/day × avg size × retention days × replication factor).
    5. Bandwidth = peak QPS × avg payload size.
    6. Sanity-check against well-known systems ("Twitter does ~6k QPS writes, YouTube does ~30 TB/day uploads").

capacity_planning:
  inputs:
    - { name: "Daily active users", value: "10M", unit: "users" }
    - { name: "Avg actions per user per day", value: "5", unit: "actions" }
    - { name: "Avg payload size", value: "2", unit: "KB" }
    - { name: "Retention", value: "365", unit: "days" }
    - { name: "Replication factor", value: "3", unit: "" }
    - { name: "Peak-to-average ratio", value: "3", unit: "" }
  formulas:
    - "Avg QPS = DAU × actions/user / 86400"
    - "Peak QPS = Avg QPS × peak_factor"
    - "Storage/year = DAU × actions × payload × retention × replication"
    - "Bandwidth = Peak QPS × payload"
  worked_example: |
    Avg QPS = 10M × 5 / 86,400 ≈ 580 QPS
    Peak QPS = 580 × 3 ≈ 1,740 QPS
    Storage/year = 10M × 5 × 2 KB × 365 × 3 ≈ 110 TB/year
    Bandwidth = 1,740 × 2 KB ≈ 3.5 MB/s ≈ 28 Mbps
  numbers_to_memorize:
    - "1 day ≈ 10^5 seconds (86,400 exactly)"
    - "1 year ≈ 3.15 × 10^7 seconds"
    - "1 Gbps ≈ 125 MB/s"
    - "Typical cross-region RTT ≈ 100ms; cross-AZ ≈ 1-2ms; same-AZ ≈ 0.1ms"

visualization:
  type: mermaid
  content: |
    graph TD
      Assumptions[State assumptions:<br/>DAU, actions/user, payload] --> QPS[Compute avg QPS]
      QPS --> Peak[Multiply by peak factor]
      Peak --> Storage[Storage = DAU × actions × payload × retention × RF]
      Storage --> Bandwidth[Bandwidth = peak QPS × payload]
      Bandwidth --> Sanity[Sanity-check vs known systems]
  alt: "Flow: state assumptions, compute average QPS, multiply by peak factor, project storage and bandwidth, sanity-check against known systems."
---

# Overview

Capacity estimation is the skill of producing back-of-envelope numbers — QPS, storage, bandwidth — fast enough to drive architectural decisions without access to production metrics. Senior interviewers lean heavily on it because it separates engineers who reason about systems from those who memorize reference architectures.

## Why it exists

Every real architectural choice depends on scale. "Use Redis" is wrong for a 100 QPS system (overkill) and right for a 100k QPS system (necessary). Without rough numbers, you either over-engineer the first case or under-provision the second. Capacity estimation is the bridge between a vague requirement ("design Twitter") and a concrete design ("fan-out on write, because average user has 200 followers and we tolerate 100ms write latency").

## How it works

1. **State assumptions explicitly.** DAU, per-user actions, payload size, retention, replication factor, peak-to-average ratio. Your interviewer or stakeholder can challenge any one of these; they can't challenge your arithmetic.

2. **Compute average QPS.** `(DAU × actions/day) / 86,400`. Memorize `86,400 ≈ 10^5` so you can do this in your head.

3. **Multiply by peak factor.** Typical services see 2-3× peak vs average. Design to peak + 20% headroom.

4. **Project storage.** `items/day × avg size × retention × replication`. For a 3-replica distributed DB, multiply by 3. Don't forget indexes (typically 10-30% of data size for well-normalized workloads).

5. **Project bandwidth.** `peak QPS × avg payload size`. Sanity-check against NIC limits (1 Gbps ≈ 125 MB/s).

6. **Sanity-check.** Compare to known public numbers — Twitter, YouTube, Stripe have published engineering blog posts with real QPS and storage numbers. Your estimate should be in the same order of magnitude as comparable systems.

## When to use it

- Interview system design rounds — expected, rewarded.
- Early architectural planning — "can we do this on one Postgres or do we need sharding?"
- Sizing cloud resources before deployment — avoids both cost surprises and embarrassing autoscale-out events.

## When to not use it

- Optimization after a system is live — you have real metrics; use them. Estimates are for when metrics don't exist yet.
- When the answer is obvious — don't waste time estimating QPS for a single-user admin tool.

## Common mistakes

The biggest trap is forgetting that **real traffic is bursty**. Averaging over 24 hours hides the fact that your Black Friday peak is 10× your usual peak. Always multiply by a peak factor, and when possible ask what the 99th-percentile peak looks like.

The second trap is **ignoring replication and indexes**. A 100 GB dataset is 300 GB at 3× replication, and another 30-100 GB of indexes — your actual storage bill is 4-5× the raw data size.

## Connection to other topics

This underpins `sd-components`, `sd-data-stores`, `sd-caching`, and every individual system design topic. In interview prep, pair it with memorized latency numbers (L1 to cross-region) so you can speak fluently about cost of a round-trip.
