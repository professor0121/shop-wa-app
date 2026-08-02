import prisma from '../../../db.server';
import type { Template, Prisma } from '@prisma/client';

export class TemplateRepository {
  async findByNameAndLanguage(shop: string, name: string, language: string): Promise<Template | null> {
    return prisma.template.findUnique({
      where: {
        shop_name_language: {
          shop,
          name,
          language,
        },
      },
    });
  }

  async upsertTemplate(data: Prisma.TemplateCreateInput): Promise<Template> {
    return prisma.template.upsert({
      where: {
        shop_name_language: {
          shop: data.shop,
          name: data.name,
          language: data.language,
        },
      },
      update: {
        id: data.id,
        category: data.category,
        status: data.status,
        components: data.components ?? {},
        updatedAt: new Date(),
      },
      create: data,
    });
  }

  async deleteOrphanedTemplates(shop: string, activeNamesAndLanguages: { name: string; language: string }[]): Promise<void> {
    const existing = await prisma.template.findMany({
      where: { shop },
      select: { name: true, language: true },
    });

    const activeSet = new Set(
      activeNamesAndLanguages.map((t) => `${t.name}:${t.language}`)
    );

    const toDelete = existing.filter(
      (e) => !activeSet.has(`${e.name}:${e.language}`)
    );

    if (toDelete.length > 0) {
      await prisma.template.deleteMany({
        where: {
          shop,
          OR: toDelete.map((d) => ({
            name: d.name,
            language: d.language,
          })),
        },
      });
    }
  }
}

export const templateRepository = new TemplateRepository();
