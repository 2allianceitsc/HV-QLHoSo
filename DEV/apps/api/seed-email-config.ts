import { PrismaClient } from '@prisma/client';
import { uuidv7 } from 'uuidv7';
import * as nodemailer from 'nodemailer';

const prisma = new PrismaClient();

const CONFIG = {
  name:      'Gmail (Alliance ITSC)',
  provider:  'smtp',
  fromName:  'HVFlow',
  fromEmail: 'admin@allianceitsc.com',
  config: JSON.stringify({
    host: 'smtp.gmail.com',
    port: '587',
    user: 'admin@allianceitsc.com',
    pass: 'pxpnsjwtqaortmho',
  }),
};

const TEST_TO = 'khanhtl@allianceitsc.com';

async function main() {
  // 1. Upsert config by name
  const existing = await prisma.emailProviderConfig.findFirst({
    where: { name: CONFIG.name, isDeleted: false },
  });

  let configId: string;
  if (existing) {
    await prisma.emailProviderConfig.update({
      where: { id: existing.id },
      data: {
        provider:  CONFIG.provider,
        config:    CONFIG.config,
        fromName:  CONFIG.fromName,
        fromEmail: CONFIG.fromEmail,
        isActive:  true,
        logUpdatedBy: 'seed',
      },
    });
    configId = existing.id;
    console.log(`✓ Updated existing config: ${existing.id}`);
  } else {
    // Deactivate any existing active configs first
    await prisma.emailProviderConfig.updateMany({
      where: { isActive: true, isDeleted: false },
      data: { isActive: false, logUpdatedBy: 'seed' },
    });
    const created = await prisma.emailProviderConfig.create({
      data: {
        id:           uuidv7(),
        name:         CONFIG.name,
        provider:     CONFIG.provider,
        config:       CONFIG.config,
        fromName:     CONFIG.fromName,
        fromEmail:    CONFIG.fromEmail,
        isActive:     true,
        logCreatedBy: 'seed',
        logUpdatedBy: 'seed',
      },
    });
    configId = created.id;
    console.log(`✓ Created new config: ${configId}`);
  }

  // 2. Send test email directly
  console.log(`\nSending test email to ${TEST_TO}...`);
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'admin@allianceitsc.com',
      pass: 'pxpnsjwtqaortmho',
    },
  });

  await transporter.sendMail({
    from: `"HVFlow" <admin@allianceitsc.com>`,
    to: TEST_TO,
    subject: '[HVFlow] Test email — Gmail (Alliance ITSC)',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2 style="color:#111">✅ Test email successful</h2>
        <p style="color:#444">This is a test email from <strong>HVFlow</strong>.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <table style="font-size:13px;color:#666;width:100%">
          <tr><td style="padding:4px 0"><b>Config</b></td><td>${CONFIG.name}</td></tr>
          <tr><td style="padding:4px 0"><b>Provider</b></td><td>SMTP / Gmail</td></tr>
          <tr><td style="padding:4px 0"><b>From</b></td><td>HVFlow &lt;admin@allianceitsc.com&gt;</td></tr>
          <tr><td style="padding:4px 0"><b>Config ID</b></td><td style="font-size:11px">${configId}</td></tr>
          <tr><td style="padding:4px 0"><b>Sent at</b></td><td>${new Date().toISOString()}</td></tr>
        </table>
        <p style="margin-top:24px;font-size:12px;color:#999">
          If you received this, the Gmail SMTP configuration is working correctly.
        </p>
      </div>
    `,
  });

  console.log(`✓ Test email sent to ${TEST_TO}`);
  console.log(`\nDone. Config ID: ${configId}`);
}

main()
  .catch((e) => { console.error('✗ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
