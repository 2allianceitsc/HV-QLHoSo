import { PrismaClient } from '@prisma/client';
import { uuidv7 } from 'uuidv7';
import * as sgMailPkg from '@sendgrid/mail';
const sgMail = (sgMailPkg as unknown as { default: typeof sgMailPkg }).default ?? sgMailPkg;

const prisma = new PrismaClient();

const SG_API_KEY = process.env.SENDGRID_API_KEY ?? '';
if (!SG_API_KEY) {
  console.error('✗ SENDGRID_API_KEY env var is not set. Aborting.');
  process.exit(1);
}
const TEST_TO = 'khanhtl@allianceitsc.com';

const CONFIG = {
  name:      'SendGrid (Alliance ITSC)',
  provider:  'sendgrid',
  fromName:  'VIBE365',
  fromEmail: 'admin@allianceitsc.com',
  config: JSON.stringify({ apiKey: SG_API_KEY }),
};

async function main() {
  // Upsert config (don't deactivate Gmail — just add SendGrid as inactive for now)
  const existing = await prisma.emailProviderConfig.findFirst({
    where: { name: CONFIG.name, isDeleted: false },
  });

  let configId: string;
  if (existing) {
    await prisma.emailProviderConfig.update({
      where: { id: existing.id },
      data: { config: CONFIG.config, fromName: CONFIG.fromName, fromEmail: CONFIG.fromEmail, logUpdatedBy: 'seed' },
    });
    configId = existing.id;
    console.log(`✓ Updated existing config: ${configId}`);
  } else {
    const created = await prisma.emailProviderConfig.create({
      data: {
        id:           uuidv7(),
        name:         CONFIG.name,
        provider:     CONFIG.provider,
        config:       CONFIG.config,
        fromName:     CONFIG.fromName,
        fromEmail:    CONFIG.fromEmail,
        isActive:     false,
        logCreatedBy: 'seed',
        logUpdatedBy: 'seed',
      },
    });
    configId = created.id;
    console.log(`✓ Created SendGrid config: ${configId}`);
  }

  // Send test email via SendGrid
  console.log(`\nSending test email to ${TEST_TO} via SendGrid...`);
  sgMail.setApiKey(SG_API_KEY);
  await sgMail.send({
    from:    { name: CONFIG.fromName, email: CONFIG.fromEmail },
    to:      TEST_TO,
    subject: '[VIBE365] Test email — SendGrid',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#111">✅ SendGrid test successful</h2>
        <p style="color:#444">This is a test email from <strong>VIBE365</strong> via SendGrid.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <table style="font-size:13px;color:#666;width:100%">
          <tr><td style="padding:4px 0"><b>Config</b></td><td>${CONFIG.name}</td></tr>
          <tr><td style="padding:4px 0"><b>Provider</b></td><td>SendGrid</td></tr>
          <tr><td style="padding:4px 0"><b>From</b></td><td>${CONFIG.fromName} &lt;${CONFIG.fromEmail}&gt;</td></tr>
          <tr><td style="padding:4px 0"><b>Config ID</b></td><td style="font-size:11px">${configId}</td></tr>
          <tr><td style="padding:4px 0"><b>Sent at</b></td><td>${new Date().toISOString()}</td></tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#999">
          If you received this, SendGrid is configured correctly.
        </p>
      </div>
    `,
  });

  console.log(`✓ Test email sent to ${TEST_TO}`);
  console.log(`\nDone. Config ID: ${configId}`);
}

main()
  .catch((e) => {
    const body = (e as { response?: { body?: unknown } }).response?.body;
    console.error('✗ Error:', (e as Error).message);
    if (body) console.error('  SendGrid response:', JSON.stringify(body, null, 2));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
