import { vi, afterEach } from 'vitest';

// Define environment variables needed during testing
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Automatically clear all mocks between tests to prevent side effects
afterEach(() => {
  vi.clearAllMocks();
});
