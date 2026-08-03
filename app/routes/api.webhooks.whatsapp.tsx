import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { whatsAppWebhookService } from '../modules/whatsapp/services/whatsapp-webhook.service';
import { config } from '../core/config/config';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === config.META_VERIFY_TOKEN) {
    console.log('[WhatsAppWebhook] Verification successful');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[WhatsAppWebhook] Verification failed');
  return new Response('Forbidden', { status: 403 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const signatureHeader = request.headers.get('x-hub-signature-256') || '';
  const rawBody = await request.clone().text();

  const isVerified = whatsAppWebhookService.verifySignature(
    rawBody,
    signatureHeader,
    config.META_APP_SECRET
  );

  if (!isVerified) {
    console.warn('[WhatsAppWebhook] Signature verification failed');
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
