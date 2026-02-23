# PROMPTS.md — AI Disclosure

> This file documents all Generative AI (Claude by Anthropic) prompts used
---

## Tool Used
- **Model:** Claude (Anthropic)
- **Interface:** claude.ai
- **Purpose:** Analysis, code generation, documentation

---


## Prompt 1 — Project Overview Document

**Goal:** Create a detailed markdown overview document for the project.

```
Create a detailed OVERVIEW.md file for the project that covers:
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
- Complete `OVERVIEW.md` with all sections requested
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
- RabbitMQ 3.12 with management UI on 15672
- Redis 7 with persistence, password, maxmemory 256mb, allkeys-lru policy
- MongoDB 7 with init script

All services should:
- Have health checks with proper intervals
- Use named volumes for persistence
- Be on a shared bridge network called fincart_network
- Have restart: unless-stopped

Also create:
- infra/rabbitmq/rabbitmq.conf (loads definitions on startup)
- infra/rabbitmq/definitions.json (pre-declares exchanges, queues, DLX bindings)
- infra/mongodb/init.js (creates collections, indexes, seed data)
- .env.example with all required variables
```

**What Claude produced:**
- `docker-compose.yml` with all 4 services, health checks, volumes, network
- `definitions.json` pre-declaring `events.direct`, `events.dlx`, `events.processing`, `events.dlq`
- `rabbitmq.conf` pointing to definitions file
- MongoDB init script with collection creation, indexes, and 3 seed shipments
- `.env.example` with all environment variables documented

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




> **Note:** All AI-generated code was reviewed, understood, and validated
> before inclusion in the project.