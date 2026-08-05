import prisma from './app/db.server';
import { decrypt } from './app/core/security/encryption';
import * as fs from 'fs';
import * as path from 'path';

const shop = 'developmentstore-txduifzb.myshopify.com';

async function main() {
  console.log('Generating updated data.txt...');

  const config = await prisma.shopConfig.findUnique({
    where: { shop },
  });

  const templates = await prisma.template.findMany({
    where: { shop },
  });

  let whatsappTokenDecrypted = 'N/A';
  let metaAppSecretDecrypted = 'N/A';

  if (config) {
    if (config.whatsappToken) {
      try {
        whatsappTokenDecrypted = decrypt(config.whatsappToken);
      } catch (e) {
        whatsappTokenDecrypted = 'Decryption Failed';
      }
    }
    if (config.metaAppSecret) {
      try {
        metaAppSecretDecrypted = decrypt(config.metaAppSecret);
      } catch (e) {
        metaAppSecretDecrypted = 'Decryption Failed';
      }
    }
  }

  let output = '=== WHATSAPP APP CONNECTION & SYNCHRONIZED DATA ===\n\n';

  output += '--- Configuration ---\n';
  if (config) {
    output += `Shop Domain:      ${config.shop}\n`;
    output += `Phone ID:         ${config.phoneNumberId}\n`;
    output += `WABA ID:          ${config.wabaId}\n`;
    output += `Verify Token:     ${config.metaVerifyToken}\n`;
    output += `App Secret:       ${metaAppSecretDecrypted}\n`;
    output += `Access Token:     ${whatsappTokenDecrypted}\n`;
    output += `Opt-In Keywords:  ${config.optInKeywords}\n`;
    output += `Opt-Out Keywords: ${config.optOutKeywords}\n`;
    output += `Updated At:       ${config.updatedAt.toISOString()}\n`;
  } else {
    output += 'No configuration found in database.\n';
  }

  output += '\n--------------------\n\n';

  output += '--- WhatsApp Templates Sync Status ---\n';
  output += `Total Templates: ${templates.length}\n\n`;

  templates.forEach((t, i) => {
    output += `Template #${i + 1}:\n`;
    output += `  ID:       ${t.id}\n`;
    output += `  Name:     ${t.name}\n`;
    output += `  Language: ${t.language}\n`;
    output += `  Category: ${t.category}\n`;
    output += `  Status:   ${t.status}\n`;
    output += `  Components:\n`;
    try {
      const comps = typeof t.components === 'string' ? JSON.parse(t.components) : t.components;
      output += JSON.stringify(comps, null, 4)
        .split('\n')
        .map(line => `    ${line}`)
        .join('\n');
    } catch (e) {
      output += `    ${JSON.stringify(t.components)}`;
    }
    output += '\n\n';
  });

  const filePath = path.join(process.cwd(), 'data.txt');
  fs.writeFileSync(filePath, output, 'utf-8');
  console.log(`Successfully wrote WhatsApp data to ${filePath}`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
