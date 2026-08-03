import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import { campaignRepository } from '../modules/campaign/repositories/campaign.repository';
import { campaignService } from '../modules/campaign/services/campaign.service';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const campaigns = await campaignRepository.listCampaigns(shop);

  return Response.json({ campaigns });
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
      name: formData.get('name'),
      templateName: formData.get('templateName'),
      templateLanguage: formData.get('templateLanguage'),
      scheduledAt: formData.get('scheduledAt'),
    };
  }

  const { name, templateName, templateLanguage, scheduledAt } = data;

  if (!name || !templateName || !templateLanguage) {
    return Response.json(
      { error: 'Missing required parameters: name, templateName, templateLanguage' },
      { status: 400 }
    );
  }

  let parsedScheduledAt: Date | null = null;
  if (scheduledAt) {
    parsedScheduledAt = new Date(scheduledAt);
    if (isNaN(parsedScheduledAt.getTime())) {
      return Response.json(
        { error: 'Invalid scheduledAt timestamp' },
        { status: 400 }
      );
    }
  }

  try {
    const campaign = await campaignService.createAndScheduleCampaign(shop, {
      name,
      templateName,
      templateLanguage,
      scheduledAt: parsedScheduledAt,
    });

    return Response.json({ success: true, campaign });
  } catch (error: any) {
    console.error(`[ApiCampaignsRoute] Failed to create campaign for shop ${shop}:`, error);
    return Response.json(
      { error: error.message || 'Failed to create campaign' },
      { status: 500 }
    );
  }
};
