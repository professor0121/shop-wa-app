import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { authenticate } from '../shopify.server';
import prisma from '../db.server';
import { templateService } from '../modules/template/services/template.service';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const templates = await prisma.template.findMany({
    where: { shop },
    orderBy: { updatedAt: 'desc' },
  });

  return Response.json({ templates });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    await templateService.syncTemplates(shop);
    return Response.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    console.error(`[TemplatesSyncRoute] Sync failed for shop ${shop}:`, error);
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
};
