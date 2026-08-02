# Quality Assurance & Testing Specification

## Reference System
- [Development Guide](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/DevelopmentGuide.md)
- [Roadmap](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Roadmap.md)

---

## 1. Test Architecture
We enforce testing across three distinct levels to maintain code quality:
*   **Unit Tests**: Test logic isolated from network and database connections. Every helper function and core domain service must have corresponding unit tests.
*   **Integration Tests**: Validate the behavior of routes and service integrations. Uses database rollbacks or transaction resets per run.
*   **E2E (End-to-End) Tests**: Visual and functional checks of Shopify Embedded App UI pages inside iframe environments.

---

## 2. Frameworks & Tools
- **Runner**: Jest (backend/Express) & Vitest (frontend/React/Vite).
- **HTTP Mocking**: Mocking standard external requests using `msw` (Mock Service Worker) or `nock` for WhatsApp Cloud API and Shopify APIs.
- **Database Isolation**: Executing integration tests against a test database with schema sync and transactional rollbacks.

---

## 3. Mocking Meta/WhatsApp API Responses
We do not make live external HTTP calls during tests. We define standard mock response bodies:

**Example Mock Response for Meta Cloud API**:
```javascript
const mockSendResponse = {
  messaging_product: "whatsapp",
  contacts: [{ input: "+1234567890", wa_id: "1234567890" }],
  messages: [{ id: "wamid.HBgLMTIxMjM0NTY3ODkwFQIAERgSQjE4Rjg4RjNFOUIwRUQwQjhBAA==" }]
};
```

---

## 4. Quality Gates for CI
- **Unit Coverage**: Minimum 80% code coverage.
- **Static Analysis**: 0 TypeScript compilation errors, 0 ESLint warnings.
- **Security Check**: `npm audit` or automated Snyk scans must return zero critical or high vulnerabilities.
