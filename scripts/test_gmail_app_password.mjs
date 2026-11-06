import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';

const rawToken = process.argv[2] || process.env.GMAIL_APP_PASSWORD || '';
const cleanToken = rawToken.trim().replace(/\s+/g, '');
const targetEmail = process.argv[3] || process.env.PLATFORM_ADMIN_EMAIL || 'thecornerstreams@gmail.com';

if (!cleanToken) {
  console.error('\n[ERROR] No Gmail App Password provided.');
  console.error('Usage: node scripts/test_gmail_app_password.mjs "<16-character-token>" [recipient@gmail.com]\n');
  process.exit(1);
}

console.log('--- CORNERBRIEF GMAIL LIVE DISPATCH TEST ---');
console.log(`• Sender / User: ${targetEmail}`);
console.log(`• Target Recipient: ${targetEmail}`);
console.log(`• App Password length: ${cleanToken.length} characters (spaces stripped)`);
console.log('• Connecting to Google SMTP (smtp.gmail.com:465 / service: gmail)...');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: targetEmail,
    pass: cleanToken,
  },
});

async function main() {
  try {
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
    const info = await transporter.sendMail({
      from: `"CornerBrief Platform Verification" <${targetEmail}>`,
      to: targetEmail,
      subject: `[CornerBrief Platform] Live Gmail Verification Test — ${new Date().toLocaleTimeString()}`,
      text: `CornerBrief Central Platform Administration — Gmail Integration Test\n\nRecipient: ${targetEmail}\nTime: ${timestamp} WAT\n\nYour 16-character Google App Password was verified and authenticated successfully by Google SMTP servers.\nAutomatic registration and approval alerts are now operational.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 24px 28px; color: #ffffff;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.85;">CornerBrief Platform Verification</div>
            <h1 style="margin: 6px 0 0; font-size: 22px; font-weight: 700;">Live Gmail SMTP Verified ✓</h1>
          </div>
          <div style="padding: 28px; color: #1e293b; font-size: 14px; line-height: 1.6;">
            <p style="margin-top: 0;">This email confirms that your <strong>16-character Google App Password</strong> was verified and authenticated successfully by Google SMTP servers.</p>
            <p><strong>Google Message ID:</strong> <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px;">${info?.messageId || 'Delivered'}</code></p>
          </div>
        </div>
      `,
    });

    console.log('\n[SUCCESS] Google SMTP accepted the credentials!');
    console.log(`• Google Message ID: ${info.messageId}`);
    console.log(`• Response from Google: ${info.response}`);

    // Persist to .env file for future runs
    const envPath = path.resolve(process.cwd(), '.env');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }
    const lines = content.split('\n');
    const existingKeys = new Set();
    const updates = {
      GMAIL_USER: targetEmail,
      GMAIL_APP_PASSWORD: cleanToken,
      PLATFORM_ADMIN_EMAIL: targetEmail,
    };
    const updatedLines = lines.map((line) => {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match) {
        const key = match[1];
        existingKeys.add(key);
        if (key in updates) {
          return `${key}="${updates[key]}"`;
        }
      }
      return line;
    });
    for (const [key, val] of Object.entries(updates)) {
      if (!existingKeys.has(key)) {
        updatedLines.push(`${key}="${val}"`);
      }
    }
    fs.writeFileSync(envPath, updatedLines.filter((l, idx, arr) => !(idx === arr.length - 1 && l === '')).join('\n') + '\n');
    console.log('• Saved credentials to .env file for automated notifications.');
  } catch (err) {
    console.error('\n[FAILED] Google SMTP Rejection:');
    console.error(`• Error: ${err.message}`);
    if (err.code) console.error(`• Code: ${err.code}`);
    if (err.response) console.error(`• Response: ${err.response}`);
    process.exit(1);
  }
}

main();
