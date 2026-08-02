# Deployment Specification

## Reference System

- [Architecture](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Architecture.md)
- [Roadmap](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Roadmap.md)

---

## 1. Environment Variables Configuration

The following variables must be configured in the production environment:

| Key                  | Description                                | Type                     |
| -------------------- | ------------------------------------------ | ------------------------ |
| `SHOPIFY_API_KEY`    | Shopify App Client ID                      | String                   |
| `SHOPIFY_API_SECRET` | Shopify App Client Secret                  | String                   |
| `SCOPES`             | Authorized Shopify permissions             | String (comma-separated) |
| `HOST`               | App tunnel or production domain URL        | URL                      |
| `DATABASE_URL`       | PostgreSQL Connection string               | Connection URL           |
| `REDIS_URL`          | Redis URL for BullMQ queues                | Connection URL           |
| `ENCRYPTION_KEY`     | Hex-encoded key for AES-256-GCM            | 32-byte Hex String       |
| `META_APP_SECRET`    | Meta Developer App Secret                  | String                   |
| `META_VERIFY_TOKEN`  | Arbitrary token to verify WhatsApp Webhook | String                   |

---

## 2. Docker Setup

We will employ a multi-stage Docker build to deploy the web server and background workers.

- **Dockerfile structure**:
  1.  _Build stage_: Install npm dev dependencies and build front-end files (Vite / Polaris bundle compiled to static files in the dist folder).
  2.  _Production stage_: Clean build containing only backend source files, package.json dependencies, and public asset files.
- **Containers**:
  - `web`: Standard entrypoint running `npm run start` (Express backend serving React assets).
  - `worker`: Entrypoint running worker script (e.g. `node src/workers/index.js`) to process queues.

---

## 3. GitHub Actions CI/CD Pipeline

Continuous integration will execute on every pull request and merge to `main`.

- **Build & Lint Verification**: Runs ESLint, TypeScript compilation (`tsc`), and Jest test cases.
- **Docker Build & Push**: Automatically builds the Docker image and publishes it to a container registry (e.g., GHCR, DockerHub, or AWS ECR).
- **Deploy Stage**: Triggers deployment script (e.g., AWS ECS task update, Fly.io deploy, or Kubernetes rolling update).
