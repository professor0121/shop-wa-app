# API Specification

## Reference System

- [Architecture](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Architecture.md)
- [Security](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Security.md)

---

## Authentication Schemes

### 1. Shopify Session Token (App Bridge JWT)

- **Target**: Protected Frontend-to-Backend endpoints.
- **Header**: `Authorization: Bearer <Shopify-Session-Token>`
- **Validation**: Verify signature using Shopify API library and check issuer (`iss`), client ID, and expiration (`exp`).

### 2. Shopify Webhook Verification (HMAC)

- **Target**: `/api/webhooks/shopify`
- **Header**: `X-Shopify-Hmac-Sha256`
- **Validation**: Generate HMAC-SHA256 from the raw request body using the client client secret, compare base64 hash with header.

### 3. WhatsApp Webhook Verification

- **Target**: `/api/webhooks/whatsapp`
- **Validation**:
  - **GET (Verification)**: Meta sends query parameters (`hub.mode`, `hub.challenge`, `hub.verify_token`). Verify the verification token matches the app's configured token, and return the challenge.
  - **POST (Events)**: Meta sends `X-Hub-Signature-256`. Generate HMAC-SHA256 signature using Meta client secret on raw body and verify.

---

## Endpoints Directory

### 1. Webhooks

- `POST /api/webhooks/shopify`
  - Ingests shop events (app/uninstalled, customers/update, orders/create, checkouts/update).
- `GET /api/webhooks/whatsapp`
  - Verifies webhook connection to Meta.
- `POST /api/webhooks/whatsapp`
  - Receives incoming chat messages, delivery receipts, read receipts, and status updates.

### 2. Message Templates

- `GET /api/templates`
  - Returns synced Meta WhatsApp templates.
- `POST /api/templates/sync`
  - Triggers background queue task to fetch latest templates from WhatsApp Cloud API.

### 3. Campaigns

- `GET /api/campaigns`
  - List all bulk campaign broadcasts.
- `POST /api/campaigns`
  - Create a new broadcast campaign (scheduling a dispatch queue task).

### 4. Automations

- `GET /api/automations`
  - List active trigger-action notification workflows.
- `POST /api/automations`
  - Create or update triggers (e.g. cart abandonment delays).

### 5. Analytics

- `GET /api/analytics/dashboard`
  - Aggregate delivery, read, reply, and click rates.
