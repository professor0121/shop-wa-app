import { z } from 'zod';

const configSchema = z.object({
  SHOPIFY_API_KEY: z.string().min(1, 'SHOPIFY_API_KEY is required'),
  SHOPIFY_API_SECRET: z.string().min(1, 'SHOPIFY_API_SECRET is required'),
  SCOPES: z.string().min(1, 'SCOPES is required'),
  HOST: z.string().min(1, 'HOST/SHOPIFY_APP_URL is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  ENCRYPTION_KEY: z
    .string()
    .length(64, 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  const result = configSchema.safeParse({
    SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
    SCOPES: process.env.SCOPES,
    HOST: process.env.SHOPIFY_APP_URL || process.env.HOST,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  });

  if (!result.success) {
    console.error('❌ Invalid environment configuration:', result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

// Lazy-loaded or evaluated on require
export const config = loadConfig();
