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
```
1- init and setup project
2- create project stature (HMVC)
    - create module events-gateway
        - services, controllers, dto, repositories
        - use Redis as middleware for deduplication (idempotency)
        - create Hmac middleware
    - create shared folder 
        - create redis(provider, service) for prevent dupications events
        - 
    
``` 

