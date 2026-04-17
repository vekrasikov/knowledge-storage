---
id: kafka-partitions

cheat_sheet:
  key_facts:
    - "Partitions are Kafka's unit of parallelism — N partitions = up to N concurrent consumers in one group."
    - "Producer picks partition via key hash (default), round-robin (no key), or explicit partitioner."
    - "Consumer group rebalancing can be eager (stop-the-world) or cooperative (incremental, Kafka 2.4+)."
    - "Partition count is effectively immutable — increasing it reshuffles keys; decreasing requires recreate."
    - "Rule of thumb: partition count = max(expected peak throughput / per-partition throughput, desired max consumers)."
  commands:
    - "kafka-topics.sh --describe --topic t --bootstrap-server localhost:9092   # partition layout + leader"
    - "kafka-consumer-groups.sh --describe --group g --bootstrap-server localhost:9092   # lag per partition"
  trade_offs:
    headers: [Partition count, Pro, Con]
    rows:
      - [Low (< 10), "Low metadata overhead", "Poor consumer parallelism"]
      - [Moderate (10-100), "Balanced parallelism vs overhead", "Most production workloads"]
      - [High (1000+), "Massive consumer parallelism", "Controller bottleneck; rebalance cost"]
  pitfalls:
    - "Hot partition: skewed key distribution = one partition overloaded while others idle."
    - "Consumer count > partition count = idle consumers (each partition assigned to exactly one)."
    - "Increasing partition count breaks key ordering guarantees for existing keys."
  interview_questions:
    - "Why can't a consumer group have more consumers than partitions? Show the math for throughput."
    - "You're seeing lag only on partition 7. What are the top 3 hypotheses?"
  extras_markdown: |
    ### Assignment strategies
    - **RangeAssignor** (default pre-2.4): consumers get contiguous ranges. Simple but causes skew.
    - **RoundRobinAssignor**: spreads partitions evenly.
    - **StickyAssignor**: minimizes partition movement during rebalance.
    - **CooperativeStickyAssignor**: incremental rebalance — consumers keep working during rebalancing.

capacity_planning:
  inputs:
    - { name: "Target throughput", value: "100", unit: "MB/s" }
    - { name: "Per-partition throughput ceiling", value: "10", unit: "MB/s" }
    - { name: "Desired consumer parallelism", value: "20", unit: "consumers" }
  formulas:
    - "MinPartitions = max(target_throughput / per_partition_ceiling, desired_consumers)"
  worked_example: |
    MinPartitions = max(100 / 10, 20) = max(10, 20) = 20 partitions
    Headroom for future consumer scaling: start with 30-40 to allow 2× consumer growth without repartitioning.
  numbers_to_memorize:
    - "Single Kafka partition: ~10 MB/s sustained (varies 1-50 based on record size, acks, replication)"
    - "Kafka cluster practical max partition count: ~200k with ZooKeeper, millions with KRaft"
    - "Rebalance duration with eager protocol: seconds; cooperative: near-zero stop-the-world"

visualization:
  type: mermaid
  content: |
    graph LR
      P1[Producer] -->|key=A, hash→0| T0[Partition 0]
      P1 -->|key=B, hash→1| T1[Partition 1]
      P1 -->|key=C, hash→2| T2[Partition 2]
      T0 --> C1[Consumer 1]
      T1 --> C2[Consumer 2]
      T2 --> C3[Consumer 3]
  alt: "Producer hashes key to partition; each partition in a consumer group is owned by exactly one consumer."
---

# Overview

Partitions are how Kafka achieves parallelism. A topic is a logical stream; a partition is a physical, append-only log. When you want to scale either producers or consumers, you scale partitions.

## Why it exists

Without partitioning, a single consumer has to read the entire stream in order — a hard limit on throughput. Partitioning splits the stream into independent lanes: producers spread writes across lanes, consumers (within a group) each own one or more lanes exclusively. This is the same principle as database sharding applied to a log.

## How it works

**Producer side.** When you produce a record with a key, Kafka hashes the key modulo partition count to pick a partition. Same key → same partition → same order. This is how you get per-key ordering in a massively parallel system.

**Consumer side.** Consumers join a **consumer group**. The group coordinator assigns each partition to exactly one consumer in the group. If you have 8 partitions and 4 consumers, each consumer gets 2 partitions. If you have 8 partitions and 12 consumers, 4 consumers sit idle — you can't parallelize beyond the partition count.

**Rebalancing.** When a consumer joins or leaves, the group coordinator reassigns partitions. Eager rebalancing revokes all assignments and re-distributes (stop-the-world). Cooperative rebalancing (since Kafka 2.4) moves only the partitions that need to move, so consumers keep processing during the rebalance.

## When to use what

- **Partition count — start low, grow carefully.** Doubling partition count reshuffles keys (hash mod changes), breaking per-key ordering for active keys. Plan for peak throughput + 2× consumer growth headroom.
- **Key choice.** Choose a key whose distribution matches your desired locality. User ID is good if you want all events for a user in order. Random UUID is bad if you later want ordering.
- **Assignment strategy.** Use CooperativeStickyAssignor for consumer groups that do stateful processing — minimizes disruption.

## When not to use what

- **Don't partition by timestamp or incrementing ID** — recent partitions become hot, old partitions idle.
- **Don't set partition count = consumer count exactly.** Leave headroom for future scale without repartitioning.

## Common mistakes

1. **Hot partitions from skewed keys.** If 90% of your events have `key=tenant-1`, 90% of your load hits one partition. Fix: use a composite key or a salt.

2. **More consumers than partitions.** The excess sit idle. Increase partition count, don't spin up more consumers.

3. **Ordering assumption across partitions.** Kafka guarantees order *within* a partition, not across. If you need a global order, either use 1 partition (no parallelism) or rely on application-level sequencing.

## Connection to other topics

`kafka-exactly-once` requires partition awareness — transactional writes span partitions. `kafka-reliability` (acks, ISR) is also per-partition. `outbox-pattern` and `schema-registry-evolution` both build on partition ordering guarantees.
