import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { automationRepository } from '../modules/automation/repositories/automation.repository';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const automations = await automationRepository.listAutomations(shop);

  return Response.json({ automations });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  // Accept JSON or URL-encoded form data
  let data: any = {};
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await request.json();
  } else {
    const formData = await request.formData();
    data = {
      triggerType: formData.get('triggerType'),
      templateName: formData.get('templateName'),
      templateLanguage: formData.get('templateLanguage'),
      delayHours: formData.get('delayHours'),
      active: formData.get('active'),
    };
  }

  const { triggerType, templateName, templateLanguage, delayHours, active } = data;

  if (!triggerType || !templateName || !templateLanguage || delayHours === undefined) {
    return Response.json(
      { error: 'Missing required parameters: triggerType, templateName, templateLanguage, delayHours' },
      { status: 400 }
    );
  }

  const parsedDelay = parseInt(delayHours, 10);
  if (isNaN(parsedDelay) || parsedDelay < 0) {
    return Response.json(
      { error: 'delayHours must be a valid non-negative integer' },
      { status: 400 }
    );
  }

  const isActive = active === 'false' || active === false ? false : true;

  try {
    const automation = await automationRepository.upsertAutomation(shop, triggerType, {
      templateName,
      templateLanguage,
      delayHours: parsedDelay,
      active: isActive,
    });

    return Response.json({ success: true, automation });
  } catch (error: any) {
    console.error(`[ApiAutomationsRoute] Failed to upsert automation for shop ${shop}:`, error);
    return Response.json(
      { error: error.message || 'Failed to save automation configuration' },
      { status: 500 }
    );
  }
};
