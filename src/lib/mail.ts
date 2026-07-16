import nodemailer from "nodemailer";

/**
 * Works with Microsoft 365 / Outlook, Gmail, or any SMTP host.
 *
 * Preferred env (Outlook / Microsoft 365):
 *   SMTP_HOST=smtp.office365.com
 *   SMTP_PORT=587
 *   SMTP_USER=briancasey@hiberniatrading.com
 *   SMTP_PASS=... (account password or Microsoft app password)
 *   MAIL_FROM_NAME=Hibernia Dispatch
 *
 * Legacy Gmail aliases still work: GMAIL_USER / GMAIL_APP_PASSWORD
 */
function smtpUser() {
  return (
    process.env.SMTP_USER?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    ""
  );
}

function smtpPass() {
  return (
    process.env.SMTP_PASS?.trim() ||
    process.env.GMAIL_APP_PASSWORD?.trim() ||
    ""
  );
}

function smtpHost() {
  return process.env.SMTP_HOST?.trim() || "smtp.office365.com";
}

function smtpPort() {
  const n = Number(process.env.SMTP_PORT ?? "587");
  return Number.isFinite(n) ? n : 587;
}

export function isMailConfigured() {
  return Boolean(smtpUser() && smtpPass());
}

export function getMailFrom() {
  const user = smtpUser();
  const name = process.env.MAIL_FROM_NAME?.trim() || "Hibernia Dispatch";
  if (!user) return name;
  return `"${name}" <${user}>`;
}

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: {
    filename: string;
    content: Buffer | Uint8Array;
    contentType?: string;
  }[];
}) {
  if (!isMailConfigured()) {
    throw new Error(
      "Email is not configured. Add SMTP_USER and SMTP_PASS to .env (Outlook/Microsoft 365).",
    );
  }

  const port = smtpPort();
  const transporter = nodemailer.createTransport({
    host: smtpHost(),
    port,
    secure: port === 465,
    auth: {
      user: smtpUser(),
      pass: smtpPass(),
    },
  });

  await transporter.sendMail({
    from: getMailFrom(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: Buffer.from(a.content),
      contentType: a.contentType ?? "application/pdf",
    })),
  });
}
