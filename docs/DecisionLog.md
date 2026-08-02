# Decision Log

## Reference System
- [Architecture](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Architecture.md)
- [Database](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Database.md)

---

## ADR 01: Use BullMQ and Redis for Background Processing

*   **Status**: Accepted
*   **Context**: The application handles high-volume WhatsApp message dispatching and Shopify webhooks. Handling these synchronously in Express causes timeout errors (especially during Shopify's strict 5-second webhook response window) and throttles the HTTP event loop.
*   **Decision**: Use `BullMQ` combined with a local/production `Redis` instance.
*   **Alternatives Considered**:
    - **RabbitMQ**: Excessively heavy to set up and configure for local development compared to simple Redis containers.
    - **Kue / Bee-Queue**: Deprecated or missing modern features (like parent-child job chains).
*   **Consequences**: Requires a Redis server in both development and production. Delivers resilient retry handling, job delay scheduling, and parallel execution limits.

---

## ADR 02: Use Prisma ORM with PostgreSQL

*   **Status**: Accepted
*   **Context**: We need a type-safe relational database tool with fast migrations and schema generation capabilities.
*   **Decision**: Use Prisma ORM mapped to a PostgreSQL relational database.
*   **Alternatives Considered**:
    - **Sequelize**: Verbose syntax, less developer velocity.
    - **MongoDB / Mongoose**: Lacks native strict relational constraints which are crucial for mapping shops to sessions, campaigns, and customer logs.
*   **Consequences**: Full type safety generated directly from schema files. Simple migrations.
