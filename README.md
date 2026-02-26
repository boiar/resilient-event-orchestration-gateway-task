# Resilient Event Orchestration Gateway

## Overview
A **high-concurrency asynchronous event gateway** that acts as a resilient buffer between external event producers (courier/logistics providers) and internal business logic.

---

## Technologies

| Technology | Role |
|---|---|
| **Node.js** | Runtime |
| **NestJS** | Framework |
| **RabbitMQ** | Message broker |
| **Redis** |  Idempotency store — deduplication |
| **MongoDB** | Persistent store |

---
## Challenges  
### Problem 1 - Speed
The system must respond to every incoming notification in under 150ms (faster than a blink). The trick: do almost nothing at the front door just check it's real, stamp it, and throw it in the queue.

### Problem 2 - Volume
100, 1000, or 10,000 notifications arriving simultaneously? No problem. The queue absorbs all of them instantly. Workers process them at a controlled pace — no system overload.

### Problem 3 - Duplicates
Courier systems often send the same notification twice by accident. Your system must detect duplicates and process each event only once no double updates in the database.

### Problem 4 - Failures
The external Routing Service sometimes fails or is slow (2 second delay). Instead of giving up, your system automatically retries with increasing wait times:

---

### Steps

1. Initialize and setup project
2. Setup Docker and services
3. Create project structure (HMVC)
    - **events-gateway module**
        - Controllers, services, DTOs, repositories
        - HMAC middleware for payload signature validation
        - Redis idempotency layer to prevent duplicate event processing
        - RabbitMQ integration for background job handling (achieves response time performance)
        - Test suite
            - Unit tests for service layer
            - Integration tests for controller
            - Load test — 100 concurrent requests
    - **shared module**
        - Redis provider and service for event deduplication
    - **routing-service module** *(stub — simulates 2s processing delay)*

---

### Testing

#### Load Test — 100 Concurrent Requests
```bash
npx ts-node src/modules/events-gateway/test/load/events-gateway.load-test.ts
```

![Load test results](performance_images/load-test.png)

#### controller test < 150ms time response
```bash
 jest events-gateway.controller.spec.ts -t "should complete the request within 150ms"
 ```

**Request duration: 63.73ms**
![Load test results](performance_images/enpoint-performance-1.png)

**Request duration: 97.34ms**
![Load test results](performance_images/enpoint-performance-2.png)