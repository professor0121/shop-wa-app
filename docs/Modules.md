# Modules Specification

## Reference System

- [Architecture](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Architecture.md)
- [Roadmap](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Roadmap.md)
- [References](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/References.md)

---

## 1. Shopify OAuth & Authentication Module

- **Objective**: Establish secure embedded access for merchants inside the Shopify admin panel.
- **Dependencies**: None.
- **Outputs**: Merchant session tokens, offline/online access tokens.

## 2. Session Management Module

- **Objective**: Fast lookup of active merchant sessions, offline access token retrieval.
- **Dependencies**: Database Module.

## 3. Webhook Module

- **Objective**: Process high-volume real-time event updates from Shopify and WhatsApp.
- **Dependencies**: Queue Module, Database Module.

## 4. Customer Module

- **Objective**: Ingest, sync, and index customer contact data from Shopify to match with WhatsApp phone numbers.
- **Dependencies**: Database Module, Webhook Module.

## 5. Order / Checkout Module

- **Objective**: Track order placements and checkouts to trigger transactional messages (e.g., confirmations, abandoned checkouts).
- **Dependencies**: Database Module, Customer Module, Webhook Module.

## 6. Template Module

- **Objective**: Synchronize and manage WhatsApp interactive, media, and text message templates approved by Meta.
- **Dependencies**: Database Module, WhatsApp Integration Module.

## 7. WhatsApp Integration Module

- **Objective**: Wrapper for Meta Cloud API to send text, media, and interactive template messages, and capture user responses.
- **Dependencies**: None.

## 8. Queue Module

- **Objective**: Manage background jobs and asynchronous processing of heavy loads (sending bulk templates, handling webhook retries).
- **Dependencies**: Redis.

## 9. Automations Module

- **Objective**: Orchestrate automated trigger-action workflows (e.g., Abandoned Checkout -> wait 1 hour -> Send WhatsApp reminder).
- **Dependencies**: Queue Module, Order Module, Template Module, WhatsApp Integration Module.

## 10. Campaigns Module

- **Objective**: Execute bulk broadcast campaigns to segment lists of customers with a template message.
- **Dependencies**: Queue Module, Customer Module, Template Module, WhatsApp Integration Module.

## 11. Dashboard / Frontend Module

- **Objective**: Shopify Polaris embedded React user interface allowing the merchant to configure settings, write campaigns, and check analytics.
- **Dependencies**: Frontend App Bridge, API Gateway.

## 12. Analytics Module

- **Objective**: Log message statuses (sent, delivered, read, failed) and present metrics on campaigns and automations.
- **Dependencies**: Database Module, Webhook Module.

## 13. Billing Module

- **Objective**: Subscription plans and usage charges via Shopify RecurringCharge and UsageCharge APIs.
- **Dependencies**: Shopify OAuth Module, Database Module.
