# Project A — Semantic Path Reordering for Roadmap

**Date:** 2026-04-17
**Status:** Proposed
**Scope:** Project A of 4 (A → B → C → D). See Out of Scope for B/C/D.

## Problem

The current roadmap (8 direction files, ~272 leaf topics) lacks explicit semantic ordering. Topics are listed inside direction files but:

- Prerequisites are implicit (via group nesting only).
- There is no unified "learning path" across directions.
- Some directions run naturally in parallel (English, algorithms drills) and some are one-time tool adoptions (AI-assisted dev tools) — a flat sequence cannot represent this.
- Content gaps exist: SQL deep-dive and NoSQL are underweighted, event-driven/messaging is thin, CI/CD has only 3 topics, Security basics are missing.
- Duplicate topic IDs exist across `04-data-analysis.yaml` and `05-python.yaml` (Pandas, NumPy, Matplotlib, Jupyter).

## Goals

1. Add a unified **single learning path** (`path.yaml`) with 9 phases that cover all 8 directions conceptually, with mastery-ladder progression from fundamentals to specialization.
2. Introduce **explicit prerequisites** for topics with real local dependencies.
3. Introduce **recurring tracks** for ongoing practices (English daily, LeetCode drills, etc.) that don't fit into linear phases.
4. Resolve duplicate topic IDs without losing any user progress.
5. Fill content gaps identified in validation: SQL/NoSQL, events, CI/CD, Security basics, plus resilience/hexagonal/observability/networking/IaC/cloud topics.
6. Preserve all existing topic IDs, titles, and summaries where possible; existing `userdata.json` progress must remain valid.

## Non-Goals (deferred to B/C/D)

- **Project B** — Per-topic enrichment: `overview`, `cheat_sheet`, `visualization` fields + their content (bytebytego-style visuals, capacity planning).
- **Project C** — Event-log storage for status transitions in `userdata.json` (timestamps: `status_changed_at`, `started_at`, `completed_at`).
- **Project D** — Dynamics analytics view: velocity, time-per-topic, streaks, heatmap.

## Proposed Design

### 1. Data Model

#### `RoadmapNode` additions (`src/types.ts`)

```typescript
export interface RoadmapNode {
  id: string;
  title: string;
  summary?: string;
  resources?: string[];
  children?: RoadmapNode[];
  // NEW
  prerequisites?: string[];   // IDs of topics required before this one
  phase?: string;             // path phase id (leaf nodes only)
  phaseOrder?: number;        // position in phase, step 10 (10, 20, 30...)
  aliasOf?: string;           // canonical id; UI hides alias, progress redirects
  type?: "topic" | "reference" | "recurring"; // default "topic"
}
```

#### New file: `data/path.yaml`

```yaml
path:
  id: senior-backend-polyglot
  title: "Senior Backend Polyglot Path"
  phases:
    - id: phase-1-programming
      title: "Programming Fundamentals"
      summary: "Язык и инструменты — Java core, Python basics, AI dev tools adoption"
    - id: phase-2-cs-foundations
      title: "CS Foundations"
      summary: "Алгоритмы, DS, Big-O, SQL basics, capacity basics"
    - id: phase-3-software-design
      title: "Software Design"
      summary: "OOP, SOLID, patterns, DDD, hexagonal, testing, security basics"
    - id: phase-4-backend-engineering
      title: "Backend Engineering"
      summary: "JVM, concurrency, Spring, Persistence (SQL + NoSQL), applied security"
    - id: phase-5-system-design-hld
      title: "System Design Foundations"
      summary: "HLD components, data stores, caching, resilience, network protocols, arch security"
    - id: phase-6-distributed-events
      title: "Distributed & Event-Driven"
      summary: "Microservices, event-driven patterns, Kafka, messaging alternatives, schema evolution"
    - id: phase-7-data-ml
      title: "Data & ML Foundations"
      summary: "Pandas, NumPy, statistics, visualization, ML basics, BI tools"
    - id: phase-8-devops
      title: "DevOps & Production"
      summary: "K8s, observability, CI/CD (extended), security ops, troubleshooting, IaC, cloud"
    - id: phase-9-specialization
      title: "Specialization — AI + Fintech + Interview"
      summary: "LLM/agents/MCP/RAG, fintech patterns, interview English, FAANG prep"
  recurring:
    - topicId: leetcode-practice
      cadence: "3x/week"
    - topicId: clozemaster-practice
      cadence: "daily"
    - topicId: talkio-ai
      cadence: "2x/week"
    - topicId: shadowing
      cadence: "daily"
    - topicId: anki-srs
      cadence: "daily"
    - topicId: elsa-speak
      cadence: "daily-15min"
    - topicId: lingvist
      cadence: "daily"
    - topicId: gliglish
      cadence: "daily-free-tier"
    - topicId: langua-call-mode
      cadence: "weekly"
    # Hands-on practice (ongoing)
    - topicId: javarush
      cadence: "ongoing"
    - topicId: exercism-java
      cadence: "ongoing"
    - topicId: codewars-java
      cadence: "ongoing"
    - topicId: codewars-python
      cadence: "ongoing"
    - topicId: exercism-python
      cadence: "ongoing"
    # AI-dev-tools continuous usage
    - topicId: ai-code-review
      cadence: "ongoing"
```

#### `StudyPlan` / `study-plan.yaml`

No changes. Remains a separate "weekly schedule" layer; `path.yaml` is the semantic layer. Existing topic IDs in `study-plan.yaml` remain valid (assertion in validation).

### 2. Phase Breakdown (full)

**Legend:** `[NEW]` = topic to be created (see §6). `[alias]` = canonical target for duplicate. `[ref]` = type=reference. Order within each phase is `phaseOrder: 10, 20, 30…`.

#### Phase 1 — Programming Fundamentals (~27 topics)

Backend:
- `collections-internals`, `generics-deep`, `exceptions-patterns`, `string-internals`, `equals-hashcode`, `io-nio`
- `virtual-threads`, `pattern-matching`, `records-sealed`, `stream-gatherers`, `foreign-function-api`, `scoped-values`
- `kotlin-idioms` (moved from Kotlin group)

Python:
- `python-syntax`, `python-oop`, `python-modules`, `python-typing`, `python-async`, `python-testing`
- `pep8-style`, `hitchhikers-guide` `[ref]`

AI-dev-tools (early adoption):
- `github-copilot`, `cursor-ide`, `claude-code`

References at phase end:
- `awesome-java-repo` `[ref]`, `awesome-python-repo` `[ref]`, `python-cheatsheet` `[ref]`, `book-effective-java` `[ref]`

#### Phase 2 — CS Foundations (~13 topics)

- `algo-big-o`, `algo-common-patterns`, `algo-data-structures`, `algo-dynamic-programming`
- `sd-sql-interviews` (ACID, isolation, deadlocks, normalization)
- `sd-cap-theorem`
- `sd-requirements`, `sd-capacity`
- `window-functions`, `ctes-recursive`, `complex-joins`, `sql-interview-practice`
- `datalemur` `[ref/hands-on]`

#### Phase 3 — Software Design (~16 topics)

LLD & Patterns:
- `solid-principles`, `gof-patterns`, `composition-over-inheritance`, `lld-grokking`
- `hexagonal-architecture` `[NEW]`

DDD:
- `ddd-bounded-contexts`, `ddd-aggregates`, `ddd-events`

Testing:
- `junit5-assertj`, `testcontainers`, `contract-testing`, `architecture-tests`

Security basics:
- `crypto-fundamentals` `[NEW]` — symmetric/asymmetric, hashing, HMAC, password storage (bcrypt/argon2)
- `secure-coding-basics` `[NEW]` — input validation, output encoding, SQL-injection prevention

Kotlin design:
- `kotlin-dsl`

References:
- `java-design-patterns-repo` `[ref]`, `book-ddd-evans` `[ref]`, `ddd-resources-repo` `[ref]`

#### Phase 4 — Backend Engineering (~42 topics)

JVM internals:
- `jmm-happens-before`, `heap-stack-metaspace`, `gc-g1`, `gc-zgc-shenandoah`, `jfr-async-profiler`, `class-loading-aot`, `threadlocal-leaks`

Concurrency:
- `volatile-atomics`, `locks-synchronized`, `concurrent-collections`, `completable-future`, `virtual-threads-spring`

Kotlin:
- `kotlin-coroutines`, `ktor`

Spring Ecosystem:
- `spring-boot-3`, `spring-virtual-threads`, `spring-security-oauth2`, `spring-data-jpa`, `rest-client`, `jdbc-client`, `micrometer-observability`, `graalvm-native`, `spring-bean-lifecycle`, `spring-transactional`, `spring-autoconfig`, `spring-mvc-flow`
- (`spring-ai` moved to Phase 9)

Persistence — PostgreSQL:
- `pg-process-model`, `pg-memory`, `pg-indexing`, `pg-explain-analyze`, `pg-mvcc`, `pg-replication`
- (`pg-pgvector` moved to Phase 9)

Persistence — NoSQL + transactions:
- `mongodb-fundamentals` `[NEW]` — document model, indexes, aggregation pipeline
- `redis-deep` `[NEW]` — data types, persistence, cluster mode, pub/sub, Lua
- `isolation-levels-practical` `[NEW]` — RC/RR/SER, lost-update, phantom-read demonstrations

Applied Security:
- `tls-mtls` `[NEW]` — handshake, certificates, mTLS
- `session-csrf-headers` `[NEW]` — session management, CSRF, CSP/HSTS/X-Frame-Options
- `secret-management` `[NEW]` — Vault, KMS, anti-patterns

References:
- `spring-petclinic` `[ref]`, `high-performance-java-samples` `[ref]`, `jvm-anatomy-park` `[ref]`, `kotlin-coroutines-samples` `[ref]`, `java-specialists` `[ref]`, `pg-internals-book` `[ref]`, `book-kafka-definitive` `[ref]`

#### Phase 5 — System Design Foundations (~16 topics)

- `sd-components`, `sd-data-stores`, `sd-caching`, `sd-failure-modes`, `sd-cost-estimation`
- `oltp-vs-olap` `[NEW]` — row vs columnar, operational vs analytical
- `resilience-patterns-practical` `[NEW]` — bulkheads, timeouts, retry+jitter, rate-limiting
- `network-protocols` `[NEW]` — HTTP/2, HTTP/3, gRPC, WebSocket
- `authz-models` `[NEW]` — RBAC vs ABAC, zero-trust
- `threat-modeling-stride` `[NEW]` — STRIDE framework

Hands-on + References:
- `bytebytego` `[ref]`, `hello-interview` `[ref]`, `educative-grokking` `[ref]`
- `system-design-primer` `[ref]`, `awesome-system-design-repo` `[ref]`, `awesome-scalability` `[ref]`
- `book-ddia` `[ref]`, `book-sd-interview` `[ref]`, `book-clean-arch` `[ref]`
- `martin-fowler-articles` `[ref]`, `high-scalability-blog` `[ref]`
- `coding-interview-university` `[ref]`, `tech-interview-handbook` `[ref]`

#### Phase 6 — Distributed & Event-Driven (~19 topics)

Event-Driven patterns:
- `event-sourcing`, `cqrs`, `saga-pattern`, `outbox-pattern`

Microservices:
- `service-mesh`, `api-gateway`, `distributed-tracing`

Kafka:
- `kafka-storage-model`, `kafka-partitions`, `kafka-exactly-once`, `kafka-reliability`, `kafka-kraft`, `kafka-streams`, `kafka-connect-debezium`, `transactional-outbox`

New events:
- `rabbitmq-vs-kafka` `[NEW]` — broker trade-offs
- `schema-registry-evolution` `[NEW]` — Avro/Protobuf, forward/backward compatibility
- `dlq-poison-messages` `[NEW]` — dead-letter strategies
- `consumer-idempotency` `[NEW]` — dedup keys, offset management

References:
- `awesome-kafka-repo` `[ref]`, `confluent-kafka-cert` `[ref]`, `kafka-tutorials-confluent` `[ref]`

#### Phase 7 — Data & ML Foundations (~23 topics)

Python data libs:
- `py-pandas`, `py-numpy`, `py-matplotlib`, `py-jupyter`, `py-polars`
- `py-scikit-learn`, `py-pyspark`

Data analysis — aliases (duplicates resolved):
- `pandas` `[alias of py-pandas]`
- `numpy-basics` `[alias of py-numpy]`
- `matplotlib-seaborn` `[alias of py-matplotlib]`
- `jupyter-notebooks` `[alias of py-jupyter]`

Statistics:
- `descriptive-stats`, `distributions`, `hypothesis-testing`, `ab-testing`, `correlation-causation`

Visualization tools:
- `power-bi`, `tableau-basics`

ML basics:
- `regression-classification`, `overfitting-crossval`
- `genai-awareness` `[alias of prompt-engineering]` — see §7

DA Interview:
- `product-analytics-cases`, `take-home-project`, `behavioral-star`

Hands-on + References:
- `stratascratch` `[ref]`, `mode-analytics` `[ref]`, `kaggle-eda` `[ref]`, `power-bi-learn` `[ref]`
- `book-practical-stats` `[ref]`, `book-storytelling-data` `[ref]`, `book-sql-analysis` `[ref]`, `google-da-cert` `[ref]`
- `awesome-datascience-repo` `[ref]`, `data-engineering-roadmap` `[ref]`, `dataset-collections` `[ref]`, `100-days-ml` `[ref]`, `sql-leetcode-repo` `[ref]`

#### Phase 8 — DevOps & Production (~33 topics)

Kubernetes:
- `k8s-pods-deployments`, `k8s-probes`, `k8s-resources`, `k8s-configmaps-secrets`, `k8s-ckad`

Observability:
- `otel`, `grafana-stack`, `prometheus-alerting`, `structured-logging`
- `observability-3-pillars` `[NEW]` — metrics vs logs vs traces model

CI/CD (extended):
- `github-actions`, `docker-multi-stage`, `argocd`
- `pipeline-principles` `[NEW]` — stages, fail-fast, caching
- `deployment-strategies` `[NEW]` — blue-green / canary / rolling / shadow
- `trunk-based-development` `[NEW]` — branching, merge queue
- `release-management` `[NEW]` — SemVer, conventional commits, automated changelog
- `quality-gates` `[NEW]` — coverage, SonarQube, static analysis in pipeline

Security ops:
- `owasp-top10`, `supply-chain`, `jwt-oauth2-deep`

Troubleshooting:
- `incident-response`, `jfr-production`, `troubleshooting-cases`

IaC + Cloud:
- `iac-terraform` `[NEW]` — Terraform basics, state, modules
- `cloud-fundamentals` `[NEW]` — AWS/GCP core services (EC2/S3/VPC/IAM etc. entry level)

Hands-on + References:
- `killercoda-k8s` `[ref]`, `kodekloud-devops` `[ref]`, `play-with-docker` `[ref]`, `github-actions-workshop` `[ref]`, `ckad-exercises` `[ref]`
- `kubernetes-the-hard-way` `[ref]`, `ckad-exercises-repo` `[ref]`, `awesome-kubernetes-repo` `[ref]`, `awesome-docker-repo` `[ref]`, `awesome-actions-repo` `[ref]`, `opentelemetry-demo` `[ref]`
- `sre-google-book` `[ref]`, `12-factor-app` `[ref]`

#### Phase 9 — Specialization (~58 topics)

AI fundamentals:
- `prompt-engineering`, `embeddings`, `rag-vs-finetuning`, `tokenization`

Agent architectures:
- `react-pattern`, `plan-execute`, `multi-agent`, `human-in-loop`, `tool-calling`

Agent frameworks:
- `langgraph`, `openai-agents-sdk`, `claude-agent-sdk`, `spring-ai-agents`, `crewai`

MCP:
- `mcp-spec`, `mcp-server-building`, `mcp-reference-servers`

RAG:
- `pgvector-rag`, `chroma-local`, `rag-pipeline`, `chunking-strategies`

Agent evaluation:
- `langsmith`, `agent-testing`, `guardrails`

AI Portfolio:
- `project-mcp-server`, `project-rag-codebase`, `project-multi-agent-reviewer`, `project-spring-ai-api`

Backend AI (moved from Phase 4):
- `spring-ai`, `pg-pgvector`, `sd-ai-components`

Fintech:
- `real-time-payments`, `fraud-detection`, `pci-dss`, `big-data-medallion`

Advanced Python for AI:
- `py-langchain`, `py-fastapi`

Interview English:
- `smalltalk2me`, `yoodli`, `pramp-english`, `interviewing-io`, `star-method-english`

Arch interview practice:
- `codemia-io` `[ref]`, `pramp-sd` `[ref]`, `educative-lld` `[ref]`

Hands-on + References:
- `deeplearning-ai-agents` `[ref]`, `deeplearning-crewai` `[ref]`, `anthropic-cookbook` `[ref]`, `langchain-tutorials` `[ref]`, `openai-cookbook` `[ref]`, `spring-ai-samples` `[ref]`, `huggingface-courses` `[ref]`
- `book-llm-apps` `[ref]`, `book-ai-engineering` `[ref]`
- `anthropic-cookbook-repo` `[ref]`, `openai-cookbook-repo` `[ref]`, `langchain-templates` `[ref]`, `awesome-llm-apps` `[ref]`, `mcp-servers-repo` `[ref]`, `awesome-mcp-servers` `[ref]`, `awesome-prompts` `[ref]`, `papers-with-code` `[ref]`
- `simon-willison-blog` `[ref]`, `anthropic-research` `[ref]`, `latent-space-newsletter` `[ref]`
- `awesome-claude-code` `[ref]`, `awesome-cursor` `[ref]`, `ai-coding-benchmarks` `[ref]`, `ai-limitations` `[ref]`

### 3. Recurring Tracks (not in any phase)

See `path.recurring` block in §1. Handle in UI:
- Rendered as a separate "Ongoing Practice" sidebar/panel alongside phases.
- Progress counted independently (topic can be `in_progress` indefinitely).
- Does not block phase progress.

### 4. Cross-Cutting English (parallel timeline)

`english-phases` (Activation → Immersion → Polish) is orthogonal to the 9 programming phases. UI treatment:
- Separate horizontal timeline rendered above or below the main 9-phase ladder.
- 3 phases with their own duration estimates (1-3 mo, 4-8 mo, 9-12 mo).
- Topics inside (`vocabulary-grammar`, `speaking`, `writing`, `reading-listening`, `tech-english`, `immersion` — ~35 topics total) have `phase: english-<phase>` not mapped into the 9 main phases.
- Except `interview-english.*` (5 topics) which map to Phase 9 (interview prep cluster).

Daily English practices stay in `recurring` (clozemaster, shadowing, talkio, anki-srs, elsa-speak, lingvist, gliglish, langua-call-mode).

### 5. Prerequisites Strategy

Two layers:

**Implicit (by phase):** every topic in phase N has all topics in phases < N as implicit prereqs. Not stored in YAML; UI computes from `phase` field.

**Explicit (`prerequisites: [id, ...]`):** only for real intra-phase or adjacent-phase dependencies. Target density: 20-30% of topics. Examples to author:

- `gc-zgc-shenandoah.prerequisites: [gc-g1]`
- `kafka-exactly-once.prerequisites: [kafka-partitions, kafka-reliability]`
- `kafka-streams.prerequisites: [kafka-partitions]`
- `saga-pattern.prerequisites: [event-sourcing]` (or `cqrs`)
- `outbox-pattern.prerequisites: [spring-transactional, kafka-connect-debezium]`
- `transactional-outbox.prerequisites: [outbox-pattern]`
- `schema-registry-evolution.prerequisites: [kafka-partitions]`
- `consumer-idempotency.prerequisites: [kafka-exactly-once]`
- `pgvector-rag.prerequisites: [pg-indexing, embeddings]`
- `spring-transactional.prerequisites: [spring-bean-lifecycle, spring-data-jpa]`
- `spring-autoconfig.prerequisites: [spring-bean-lifecycle]`
- `spring-virtual-threads.prerequisites: [virtual-threads, spring-mvc-flow]`
- `virtual-threads-spring.prerequisites: [virtual-threads, completable-future]`
- `jfr-async-profiler.prerequisites: [heap-stack-metaspace]`
- `threadlocal-leaks.prerequisites: [heap-stack-metaspace]`
- `resilience-patterns-practical.prerequisites: [sd-failure-modes]`
- `deployment-strategies.prerequisites: [pipeline-principles]`
- `release-management.prerequisites: [trunk-based-development]`
- `quality-gates.prerequisites: [pipeline-principles]`
- `iac-terraform.prerequisites: [cloud-fundamentals]`
- `threat-modeling-stride.prerequisites: [owasp-top10]`
- `authz-models.prerequisites: [jwt-oauth2-deep]`
- `mcp-server-building.prerequisites: [mcp-spec, tool-calling]`
- `rag-pipeline.prerequisites: [embeddings, chunking-strategies]`
- `chunking-strategies.prerequisites: [embeddings]`
- `project-mcp-server.prerequisites: [mcp-server-building, python-async]`
- `project-rag-codebase.prerequisites: [pgvector-rag, rag-pipeline]`
- `project-spring-ai-api.prerequisites: [spring-ai, tool-calling]`
- `hexagonal-architecture.prerequisites: [solid-principles, ddd-aggregates]`
- `secure-coding-basics.prerequisites: [crypto-fundamentals]`
- `tls-mtls.prerequisites: [crypto-fundamentals]`

Full list in implementation: aim for ~60-80 explicit prereq edges. Plan will schedule this as a dedicated authoring pass.

### 6. New Topics to Add (26 total)

| Phase | Topic ID | Short description |
|-------|----------|-------------------|
| 3 | `hexagonal-architecture` | Ports & Adapters, Clean Architecture in practice |
| 3 | `crypto-fundamentals` | Symmetric/asymmetric, hashing, HMAC, bcrypt/argon2 |
| 3 | `secure-coding-basics` | Input validation, output encoding, injection prevention |
| 4 | `mongodb-fundamentals` | Document model, indexes, aggregation pipeline |
| 4 | `redis-deep` | Data types, persistence, cluster, pub/sub, Lua |
| 4 | `isolation-levels-practical` | RC/RR/SER in action, lost-update, phantom-read |
| 4 | `tls-mtls` | TLS handshake, certificates, mTLS |
| 4 | `session-csrf-headers` | Session management, CSRF, CSP/HSTS/X-Frame-Options |
| 4 | `secret-management` | Vault, KMS, env-var anti-patterns |
| 5 | `oltp-vs-olap` | Row vs columnar, workload distinction |
| 5 | `resilience-patterns-practical` | Bulkheads, timeouts, retry+jitter, rate limiting |
| 5 | `network-protocols` | HTTP/2, HTTP/3, gRPC, WebSocket |
| 5 | `authz-models` | RBAC vs ABAC, zero-trust principles |
| 5 | `threat-modeling-stride` | STRIDE framework |
| 6 | `rabbitmq-vs-kafka` | Broker trade-offs for system design |
| 6 | `schema-registry-evolution` | Avro/Protobuf, forward/backward compat |
| 6 | `dlq-poison-messages` | Dead-letter and poison-message strategies |
| 6 | `consumer-idempotency` | Dedup keys, offset management, compensations |
| 8 | `observability-3-pillars` | Metrics vs logs vs traces mental model |
| 8 | `pipeline-principles` | Pipeline stages, fail-fast, caching, artifacts |
| 8 | `deployment-strategies` | Blue-green, canary, rolling, shadow |
| 8 | `trunk-based-development` | Branching strategies, merge queue |
| 8 | `release-management` | SemVer, conventional commits, auto-release |
| 8 | `quality-gates` | Coverage, SonarQube, static analysis in CI |
| 8 | `iac-terraform` | Terraform basics, state, modules |
| 8 | `cloud-fundamentals` | AWS/GCP core: compute, storage, network, IAM |

Each new topic requires `summary` + 3-5 curated `resources`. Authoring will follow the existing style (brief senior-engineer rationale, books + docs + videos + hands-on).

### 7. Duplicate Resolution

| Duplicate (alias) | Canonical ID | Location |
|-------------------|--------------|----------|
| `pandas` (04) | `py-pandas` | 05 |
| `numpy-basics` (04) | `py-numpy` | 05 |
| `matplotlib-seaborn` (04) | `py-matplotlib` | 05 |
| `jupyter-notebooks` (04) | `py-jupyter` | 05 |
| `genai-awareness` (04) | `prompt-engineering` | 06 |

Handling: alias node keeps entry in YAML with `aliasOf: canonical-id`. At load time, `src/data/roadmap.ts`:
1. Builds canonical → node map.
2. For any node with `aliasOf`, drops it from render tree.
3. Wraps progress read/write: `getProgress(id)` resolves alias → canonical; `setProgress(id, status)` writes to canonical. Ensures users with prior `in_progress`/`done` for an alias keep it.

### 8. Validation Rules (build time)

Implement as a vite plugin or pre-commit script (`scripts/validate-roadmap.ts`):

1. **ID uniqueness:** no duplicate IDs across all `data/roadmap/*.yaml` + `path.yaml`.
2. **Alias resolution:** every `aliasOf` points to an existing canonical.
3. **Phase assignment:** every leaf node has either `phase` (matching a phase id in `path.yaml`) OR `type: recurring` OR `type: reference` attached to a phase OR belongs to `english-*` phase.
4. **Phase coverage:** every phase id in `path.yaml` is referenced by at least one topic.
5. **Prereq existence:** every id in any `prerequisites[]` points to an existing (non-alias) topic.
6. **No prereq cycles:** topological sort succeeds over the DAG.
7. **phaseOrder uniqueness:** no two topics share the same `phaseOrder` within the same phase.
8. **study-plan compat:** every `topicId` in `study-plan.yaml` resolves to an existing canonical (or alias).
9. **Recurring topicId existence:** every `path.recurring[].topicId` points to existing topic.

Violation = build failure.

### 9. UI Impact (minimal for Project A)

Project A focuses on data. UI changes are limited to:

- `src/data/roadmap.ts` — alias resolution + canonical mapping.
- New `src/data/path.ts` — load and expose `path.yaml`.
- Navigation: optionally add a new route `/path` next to existing `/roadmap` (out of scope if too much work; can ship without UI changes and add in a follow-up).
- Existing direction-based UI continues to work unchanged.

Full visual path view (phase ladder, recurring sidebar, English parallel timeline) is part of Project B or its own follow-up.

## Migration Plan

Implementation order:

1. Update `src/types.ts` with new fields.
2. Add validation script.
3. Resolve duplicates (add `aliasOf` entries, update `src/data/roadmap.ts`).
4. Author 26 new topics (one PR per phase group: Phase 3 security, Phase 4 NoSQL+security, Phase 5 arch, Phase 6 events, Phase 8 CI/CD+IaC).
5. Write `data/path.yaml` with phase definitions + recurring list.
6. Assign `phase` + `phaseOrder` to all topics across 8 YAML files.
7. Author ~60-80 explicit `prerequisites[]` entries.
8. Run validator, fix issues.
9. Optional: add `/path` route with minimal list view.

## Out of Scope

- **Project B** — `overview`, `cheat_sheet`, `visualization` fields and content.
- **Project C** — Event-log userdata schema (status transition timestamps).
- **Project D** — Dynamics analytics UI.
- Visual path rendering (ladder graphic, dependency graph view) beyond minimal list.
- Automatic generation of weekly schedule from path.
- Tag-based alternative paths (option 4 from brainstorm — deferred).

## English Cross-Cutting Phase IDs

Explicit enumeration of `english-*` phase values used on English topics (not part of the main 9 phases):

- `english-phase1-activation` — `phase1-activation`, `vocabulary-grammar.*`
- `english-phase2-immersion` — `phase2-immersion`, `speaking.*` (except interview), `writing.*`, `reading-listening.*`, `tech-english.*`
- `english-phase3-polish` — `phase3-polish`, `immersion.*`

Topics under `interview-english` (5) do **not** get `english-*` phase — they map to `phase-9-specialization`.

## Open Questions

1. Should references (`type: "reference"`) count toward phase completion percent? Proposed: yes, but UI shows them separately and user can toggle "hide completed references".
2. Should `study-plan.yaml` be regenerated from `path.yaml` later? Out of scope here; flagged as future work.

## Success Criteria

- All 272 existing topics resolvable by ID; zero user progress loss.
- 26 new topics authored with summary + resources matching existing style.
- `path.yaml` loads and validates; every non-recurring leaf has a phase.
- Validation script catches broken prereqs and orphan IDs.
- `npm run build` succeeds; existing tests pass.
- Manual smoke test: open the app, verify all directions render, marked-done topics stay done.
