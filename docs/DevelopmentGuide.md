# Local Development Guide

## Reference System

- [Architecture](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Architecture.md)
- [Database](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Database.md)

---

## 1. Prerequisites

- **Node.js**: >= 18.x.x
- **Docker**: For local database and Redis services
- **Shopify Partners Account**: Access to Shopify Partners Dashboard to create and manage test apps.
- **Shopify CLI**: To manage app credentials, tunnels, and extensions.

---

## 2. Setting Up the Development Services

Create a local environment using `docker-compose` to run Postgres and Redis:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: shopify
      POSTGRES_PASSWORD: password
      POSTGRES_DB: shopify_whatsapp_dev
    ports:
      - '5432:5432'

  redis:
    image: redis:alpine
    ports:
      - '6379:6379'
```

---

## 3. Database Migration

We use Prisma to orchestrate schema updates:

- **Apply migrations**: `npx prisma migrate dev`
- **Reset database**: `npx prisma migrate reset`
- **Explore data**: `npx prisma studio`

---

## 4. Run commands

- Install dependencies: `npm install`
- Start dev server: `npm run dev` (runs Shopify App Dev tunnel and launches frontend/backend)
- Run workers locally: `npm run worker:dev`

---

## 5. Coding Standards

- **Linter**: ESLint (extends standard Shopify or Airbnb configurations)
- **Formatting**: Prettier
- **Types**: Strict TypeScript check (`noImplicitAny: true`, `strictNullChecks: true`)
- **Git Strategy**: Feature branching, conventional commits.
