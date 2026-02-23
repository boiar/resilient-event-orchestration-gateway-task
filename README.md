# Resilient Event Orchestration Gateway

## Overview
A **high-concurrency asynchronous event gateway** that acts as a resilient buffer between external event producers (courier/logistics providers) and internal business logic.


## Technologies

| Technology | Role |
|---|---|
| **Node.js** | Runtime |
| **NestJS** | Framework |
| **RabbitMQ** | Message broker |
| **Redis** |  Idempotency store — deduplication |
| **MongoDB** | Persistent store |
