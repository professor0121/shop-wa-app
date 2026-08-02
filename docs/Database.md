# Database Schema Specification

## Reference System
- [Architecture](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Architecture.md)
- [Modules](file:///c:/Users/ravik/OneDrive/Desktop/shop/docs/Modules.md)

---

## Schema Design (Prisma / PostgreSQL)

### 1. Session Table
Tracks active merchant login credentials.

```prisma
model Session {
  id            String    @id
  shop          String    @unique
  state         String
  isOnline      Boolean   @default(false)
  scope         String?
  expires       DateTime?
  accessToken   String
  userId        BigInt?
}
```

### 2. Shop Configuration Table
Stores WhatsApp details, token configuration, and app plan tier.

```prisma
model ShopConfig {
  id                 String   @id @default(uuid())
  shop               String   @unique
  whatsappToken      String?  // encrypted Meta Cloud API token
  phoneNumberId      String?  // Meta WhatsApp Phone ID
  wabaId             String?  // WhatsApp Business Account ID
  optInKeywords      String   @default("START,SUBSCRIBE")
  optOutKeywords     String   @default("STOP,UNSUBSCRIBE")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

### 3. Customer Table
Tracks opt-in statuses and customer contact records synced from Shopify.

```prisma
model Customer {
  id                 String    @id // Shopify Customer ID (e.g. gid://shopify/Customer/12345)
  shop               String
  phone              String    // E.164 format (e.g. +1234567890)
  firstName          String?
  lastName           String?
  optedIn            Boolean   @default(true)
  optedInAt          DateTime?
  optedOutAt         DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@unique([shop, phone])
  @@index([shop])
}
```

### 4. Template Table
Stores cached templates from WhatsApp Cloud API.

```prisma
model Template {
  id                 String   @id // Meta Template ID
  shop               String
  name               String
  language           String
  category           String
  status             String
  components         Json     // holds header, body, button structure
  updatedAt          DateTime @updatedAt

  @@unique([shop, name, language])
}
```

### 5. Campaign Table
Stores bulk broadcasts metadata.

```prisma
model Campaign {
  id                 String   @id @default(uuid())
  shop               String
  name               String
  templateName       String
  templateLanguage   String
  status             String   // DRAFT, SCHEDULED, PROCESSING, COMPLETED, FAILED
  scheduledAt        DateTime?
  sentCount          Int      @default(0)
  deliveredCount     Int      @default(0)
  readCount          Int      @default(0)
  failedCount        Int      @default(0)
  createdAt          DateTime @default(now())
}
```

### 6. Message Log Table
Factual record of all inbound/outbound WhatsApp messages.

```prisma
model MessageLog {
  id                 String   @id // Meta Message ID (wamid.XYZ...)
  shop               String
  phone              String
  direction          String   // INBOUND, OUTBOUND
  status             String   // SENT, DELIVERED, READ, FAILED
  errorMessage       String?
  body               String?
  campaignId         String?
  createdAt          DateTime @default(now())

  @@index([shop, phone])
  @@index([campaignId])
}
```
