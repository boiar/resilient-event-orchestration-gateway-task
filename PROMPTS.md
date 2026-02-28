# PROMPTS.md — AI Disclosure

> This file documents all Generative AI (Claude by Anthropic) prompts used
---

## Tool Used
- **Model:** Claude (Anthropic)
- **Interface:** claude.ai
- **Purpose:** Analysis, code generation, documentation

---


## Prompt 1 — Project README Document

**Goal:** Create a detailed markdown README document for the project.

```
Create a detailed README.md file for the project that covers:
- What we are building and why
- System components explained
- Technologies table with versions and purpose
- Full project folder structure
- Event lifecycle step by step (numbered flow)
- HMAC validation flow
- Idempotency strategy (both layers: Redis + MongoDB)
- Dead Letter Queue strategy with ops playbook
- Eventual consistency approach
- Concurrency model with numbers
- Quick start commands
- Services and ports table
```

**What Claude produced:**
- Complete `README.md` with all sections requested
- ASCII flow diagram for event lifecycle
- Two-layer idempotency explanation (Redis SET NX + MongoDB conditional update)
- DLQ ops playbook table (Monitor → Alert → Inspect → Replay → Purge)
- Concurrency math: prefetch=10, 2s delay, 100 events → ~20s drain time

---


## Prompt 2 — Docker Compose + Infrastructure Files

**Goal:** Create the full Docker Compose setup with all supporting infrastructure files.

```
Create a docker-compose.yml that spins up 4 services with a single command:
- NestJS app on port 3000 with health check
- Redis 7 with persistence, password, maxmemory 256mb, allkeys-lru policy (for BullMQ)
- MongoDB 7 with init script
- Mongo-Express for database visualization

All services should:
- Have health checks with proper intervals
- Use named volumes for persistence
- Be on a shared bridge network called fincart_network
- Have restart: unless-stopped

Also create:
- infra/mongodb/init.js (creates collections, indexes, seed data)
- .env.example with all required variables
```

**What Claude produced:**
- `docker-compose.yml` with all 4 services, health checks, volumes, network
- BullMQ configuration for reliable asynchronous job processing
- MongoDB init script with collection creation, indexes, and seed shipment data
- `.env.example` with all environment variables documented for Redis and MongoDB


---

## Prompt 3 — Dockerfile (Single Stage)

**Goal:** Create a simple single-stage Dockerfile for the NestJS app.

```
Create a single-stage Dockerfile for NestJS (not multi-stage).
It should:
- Use node:20-alpine as base
- Install curl for healthcheck
- Copy package.json first for better layer caching
- Run npm install
- Copy source
- Run npm run build
- Expose port 3000
- Run node dist/main
```

**What Claude produced:**
- Clean single-stage `Dockerfile` with correct layer ordering
- `HEALTHCHECK` instruction using curl
- Explanation of why `COPY package*.json` comes before `COPY . .` (Docker layer caching)

---

## Prompt 4 — Reliability & Retry Refinement

**Goal:** Resolve conflict between Idempotency Lock and BullMQ Retry mechanism.

**What Antigravity performed:**
- Identified a critical logic issue where the Redis idempotency lock (TTL 60s) prevented BullMQ's exponential backoff retries (e.g., 1s, 2s, 4s) from executing, as the lock was intentionally NOT released on failure.
- Modified `EventsGatewayService.processQueuedEvent` to:
    1. Add a secondary idempotency check against the MongoDB `PROCESSED` status.
    2. Explicitly **release the lock** in the `catch` block, enabling BullMQ retries to successfully re-acquire the lock and re-attempt the task.
- Fixed directory structure misspellings ("implemention" → "implementation") and updated global imports.
- Updated the `README.md` lifecycle documentation to accurately describe the new "Release on Failure" strategy.

---

> **Note:** All AI-generated code was reviewed, understood, and validated
> before inclusion in the project.