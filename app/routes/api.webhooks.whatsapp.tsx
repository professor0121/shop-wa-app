import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { whatsAppWebhookService } from '../modules/whatsapp/services/whatsapp-webhook.service';
import prisma from '../db.server';
import { decrypt } from '../core/security/encryption';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const shop = url.searchParams.get('shop');

  // 1. If shop is specified, check the shop-specific verify token
  if (shop) {
    const shopConfig = await prisma.shopConfig.findUnique({ where: { shop } });
    if (shopConfig && shopConfig.metaVerifyToken && mode === 'subscribe' && token === shopConfig.metaVerifyToken) {
      console.log(`[WhatsAppWebhook] Verification successful for shop: ${shop}`);
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  // 2. Fallback: Check the global Verify Token in environment variables
  const envVerifyToken = process.env.META_VERIFY_TOKEN;
  if (mode === 'subscribe' && envVerifyToken && token === envVerifyToken) {
    console.log(`[WhatsAppWebhook] Verification successful using environment Verify Token`);
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 3. Fallback: Check if the token matches any shop's Verify Token in the database
  if (mode === 'subscribe' && token) {
    const matchingConfig = await prisma.shopConfig.findFirst({
      where: { metaVerifyToken: token },
    });
    if (matchingConfig) {
      console.log(`[WhatsAppWebhook] Verification successful for shop: ${matchingConfig.shop} via matching token`);
      return new Response(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  }

  console.warn(`[WhatsAppWebhook] Verification failed. Mode: ${mode}, Shop: ${shop || 'none'}, Token: ${token || 'none'}`);
  return new Response('Forbidden', { status: 403 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get('shop');

  let decryptedAppSecret: string | null = null;

  // 1. Try to get secret from the shop parameter
  if (shop) {
    const shopConfig = await prisma.shopConfig.findUnique({ where: { shop } });
    if (shopConfig && shopConfig.metaAppSecret) {
      try {
        decryptedAppSecret = decrypt(shopConfig.metaAppSecret);
      } catch (error) {
        console.error(`[WhatsAppWebhook] Failed to decrypt metaAppSecret for shop ${shop}:`, error);
      }
    }
  }

  const signatureHeader = request.headers.get('x-hub-signature-256') || '';
  const rawBody = await request.clone().text();

  let isVerified = false;

  // Verify using shop-specific secret if found
  if (decryptedAppSecret) {
    isVerified = whatsAppWebhookService.verifySignature(
      rawBody,
      signatureHeader,
      decryptedAppSecret
    );
  }

  // 2. Fallback: Verify using environment App Secret
  const envAppSecret = process.env.META_APP_SECRET;
  if (!isVerified && envAppSecret) {
    isVerified = whatsAppWebhookService.verifySignature(
      rawBody,
      signatureHeader,
      envAppSecret
    );
  }

  // 3. Fallback: Try to verify using any shop's secret in the database
  if (!isVerified) {
    const configs = await prisma.shopConfig.findMany({
      where: {
        metaAppSecret: { not: null }
      }
    });
    for (const config of configs) {
      if (config.metaAppSecret) {
        try {
          const secret = decrypt(config.metaAppSecret);
          if (whatsAppWebhookService.verifySignature(rawBody, signatureHeader, secret)) {
            isVerified = true;
            break;
          }
        } catch {
          // ignore decryption errors for other shops
        }
      }
    }
  }

  if (!isVerified) {
    console.warn(`[WhatsAppWebhook] Signature verification failed for shop ${shop || 'unknown'}`);
    return new Response('Unauthorized signature', { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    await whatsAppWebhookService.handleWebhookPayload(payload);
    return Response.json({ success: true });
  } catch (error: any) {
    console.error('[WhatsAppWebhook] Error handling payload:', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
};
