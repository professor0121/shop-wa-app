# Security Specification

## Reference System

- [Architecture](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Architecture.md)
- [API](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/API.md)

---

## 1. Shopify Verification (HMAC)

All inbound HTTP posts to `/api/webhooks/shopify` must be verified using the store's client client secret to ensure request authenticity.

**Implementation Rule**:

```javascript
const crypto = require('crypto');
function verifyShopifyHmac(rawBody, hmacHeader, apiSecret) {
  const hash = crypto.createHmac('sha256', apiSecret).update(rawBody, 'utf8').digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}
```

## 2. Meta WhatsApp Webhook Validation

Inbound events from WhatsApp Meta Cloud API must verify `X-Hub-Signature-256` which is generated using the app secret.

**Implementation Rule**:

```javascript
function verifyWhatsAppSignature(rawBody, signatureHeader, appSecret) {
  const signature = signatureHeader.replace('sha256=', '');
  const hash = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
```

## 3. Data Encryption at Rest

Sensitive merchant data such as `whatsappToken` (Meta API Access Token) must be encrypted before being stored in the database.

- **Algorithm**: AES-256-GCM
- **Key Source**: `process.env.ENCRYPTION_KEY` (must be 32 bytes)
- **Storage**: Save encrypted text, IV, and auth tag in the database.

## 4. GDPR / Mandatory Shopify Webhooks

We must handle the three mandatory compliance endpoints:

1.  **Customers Data Request (`/api/webhooks/gdpr/customers_data_request`)**: Triggered when a customer requests their data.
2.  **Customers Redact (`/api/webhooks/gdpr/customers_redact`)**: Request to delete customer data.
3.  **Shop Redact (`/api/webhooks/gdpr/shop_redact`)**: Request to delete shop data 48 hours after uninstallation.
