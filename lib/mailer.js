const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

const esc = (s) =>
  String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function sendLeadAlert(lead) {
  const t = getTransporter();
  const to = process.env.NOTIFY_EMAIL || 'nrkweldingservices@gmail.com';
  if (!t) {
    console.log('[mailer] SMTP not configured, lead saved but no alert sent:', lead.id);
    return false;
  }
  const site = process.env.SITE_URL || '';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const rows = [
    ['Name', lead.name],
    ['Phone', lead.phone],
    ['Email', lead.email],
    ['Service', lead.service],
    ['Town', lead.town],
    ['Details', lead.message],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666"><b>${k}</b></td><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join('');
  await t.sendMail({
    from,
    to,
    replyTo: lead.email || undefined,
    subject: `New quote request: ${lead.name}${lead.service ? ' (' + lead.service + ')' : ''}`,
    text: `New quote request\n\nName: ${lead.name}\nPhone: ${lead.phone}\nEmail: ${lead.email || ''}\nService: ${lead.service || ''}\nTown: ${lead.town || ''}\n\n${lead.message || ''}\n\n${site ? site + '/admin' : ''}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px"><h2 style="margin:0 0 12px">New quote request</h2><table>${rows}</table>${
      site ? `<p style="margin-top:16px"><a href="${site}/admin">Open the lead dashboard</a></p>` : ''
    }</div>`,
  });
  return true;
}

async function sendCustomerReceipt(lead) {
  const t = getTransporter();
  if (!t || !lead.email) return false;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  await t.sendMail({
    from,
    to: lead.email,
    subject: 'We got your request, NRK Welding',
    text: `Hi ${lead.name},\n\nThanks for reaching out to NRK Welding. Nick or a member of the team will get back to you within 24-48 hours with next steps for your free estimate.\n\nNeed something sooner or have an emergency repair? Call (207) 899-6084.\n\nNRK Welding LLC\n31 Lord Road, Saco, ME 04072`,
  });
  return true;
}

module.exports = { sendLeadAlert, sendCustomerReceipt };
