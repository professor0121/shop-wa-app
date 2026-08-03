import { vi, afterEach } from 'vitest';

// Set up default environment variables for testing configuration validation
process.env.SHOPIFY_API_KEY = 'mock_shopify_api_key';
process.env.SHOPIFY_API_SECRET = 'mock_shopify_api_secret';
process.env.SCOPES = 'read_products';
process.env.HOST = 'https://mock-host.com';
process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.META_APP_SECRET = 'mock_meta_app_secret';
process.env.META_VERIFY_TOKEN = 'mock_meta_verify_token';

// Automatically clear all mocks between tests to prevent side effects
afterEach(() => {
  vi.clearAllMocks();
});
