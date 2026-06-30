import sgMail from "@sendgrid/mail";
import { env } from "@/lib/env";

const SENDGRID_FROM = env("SENDGRID_FROM") || "lui.jad@gmx.de";

let initialized = false;
function ensureInit() {
  if (initialized) return;
  const key = env("SENDGRID_API_KEY");
  if (!key) throw new Error("SENDGRID_API_KEY must be set");
  sgMail.setApiKey(key);
  initialized = true;
}

export async function sendBookingConfirmation({
  to,
  name,
  service,
  start,
  terminLink,
  shortLink: _shortLink,
}: {
  to: string;
  name: string;
  service: string;
  start: string;
  terminLink: string;
  shortLink?: string;
}) {
  const datum = new Date(start);
  const formatted = datum.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const uhrzeit = datum.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#2563eb;padding:32px 40px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:24px">Buchung bestätigt ✓</h1>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="font-size:16px;color:#333;margin:0 0 8px">Hallo ${name},</p>
<p style="font-size:16px;color:#555;margin:0 0 24px;line-height:1.5">deine Buchung ist eingegangen und wurde bestätigt.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px">
<tr><td style="padding:4px 0">
<span style="color:#666;font-size:13px">Service</span>
<p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:2px 0">${service}</p>
</td></tr>
<tr><td style="padding:4px 0">
<span style="color:#666;font-size:13px">Termin</span>
<p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:2px 0">${formatted} um ${uhrzeit}</p>
</td></tr>
</table>

<a href="${terminLink}" style="display:block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:16px;font-weight:600;text-align:center;margin-bottom:20px">
Zur Buchungsseite →</a>

<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 16px">
Dort kannst du jederzeit <strong>Nachrichten hinterlassen</strong> oder 
<strong>weitere Bilder hochladen</strong>. Du erreichst die Seite auch 
später über diesen Link.</p>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

<p style="font-size:12px;color:#999;margin:0">
Falls der Button nicht funktioniert: <br>
<a href="${terminLink}" style="color:#2563eb">${terminLink}</a></p>

</td></tr></table>
<p style="font-size:12px;color:#999;margin-top:16px">Autoaufbereitung</p>
</td></tr></table>
</body>
</html>`;

  ensureInit();
  await sgMail.send({
    to,
    from: SENDGRID_FROM,
    subject: "Deine Buchung ist bestätigt",
    html,
  });
}

export async function sendBookingPending({
  to,
  name,
  service,
  start,
  terminLink,
}: {
  to: string;
  name: string;
  service: string;
  start: string;
  terminLink: string;
}) {
  const datum = new Date(start);
  const formatted = datum.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const uhrzeit = datum.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#f59e0b;padding:32px 40px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:24px">Buchung eingegangen ⏳</h1>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="font-size:16px;color:#333;margin:0 0 8px">Hallo ${name},</p>
<p style="font-size:16px;color:#555;margin:0 0 24px;line-height:1.5">deine Buchung ist eingegangen und muss noch vom Inhaber bestätigt werden. Du erhältst eine separate E-Mail, sobald der Termin bestätigt oder abgelehnt wurde.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px">
<tr><td style="padding:4px 0">
<span style="color:#666;font-size:13px">Service</span>
<p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:2px 0">${service}</p>
</td></tr>
<tr><td style="padding:4px 0">
<span style="color:#666;font-size:13px">Wunschtermin</span>
<p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:2px 0">${formatted} um ${uhrzeit}</p>
</td></tr>
</table>

<a href="${terminLink}" style="display:block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:16px;font-weight:600;text-align:center;margin-bottom:20px">
Zur Buchungsseite →</a>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

<p style="font-size:12px;color:#999;margin:0">
Falls der Button nicht funktioniert: <br>
<a href="${terminLink}" style="color:#2563eb">${terminLink}</a></p>

</td></tr></table>
<p style="font-size:12px;color:#999;margin-top:16px">Autoaufbereitung</p>
</td></tr></table>
</body>
</html>`;

  ensureInit();
  await sgMail.send({
    to,
    from: SENDGRID_FROM,
    subject: "Buchung eingegangen – wartet auf Bestätigung",
    html,
  });
}

export async function sendBookingApproved({
  to,
  name,
  service,
  start,
  terminLink,
}: {
  to: string;
  name: string;
  service: string;
  start: string;
  terminLink: string;
}) {
  const datum = new Date(start);
  const formatted = datum.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const uhrzeit = datum.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#2563eb;padding:32px 40px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:24px">Buchung bestätigt ✓</h1>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="font-size:16px;color:#333;margin:0 0 8px">Hallo ${name},</p>
<p style="font-size:16px;color:#555;margin:0 0 24px;line-height:1.5">deine Buchung wurde angenommen und ist jetzt verbindlich.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px">
<tr><td style="padding:4px 0">
<span style="color:#666;font-size:13px">Service</span>
<p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:2px 0">${service}</p>
</td></tr>
<tr><td style="padding:4px 0">
<span style="color:#666;font-size:13px">Termin</span>
<p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:2px 0">${formatted} um ${uhrzeit}</p>
</td></tr>
</table>

<a href="${terminLink}" style="display:block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:16px;font-weight:600;text-align:center;margin-bottom:20px">
Zur Buchungsseite →</a>

<p style="font-size:14px;color:#666;line-height:1.5;margin:0 0 16px">
Dort kannst du jederzeit <strong>Nachrichten hinterlassen</strong> oder
<strong>weitere Bilder hochladen</strong>.</p>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

<p style="font-size:12px;color:#999;margin:0">
Falls der Button nicht funktioniert: <br>
<a href="${terminLink}" style="color:#2563eb">${terminLink}</a></p>

</td></tr></table>
<p style="font-size:12px;color:#999;margin-top:16px">Autoaufbereitung</p>
</td></tr></table>
</body>
</html>`;

  ensureInit();
  await sgMail.send({
    to,
    from: SENDGRID_FROM,
    subject: "Deine Buchung wurde angenommen!",
    html,
  });
}

export async function sendBookingRejected({
  to,
  name,
  service,
  start,
}: {
  to: string;
  name: string;
  service: string;
  start: string;
}) {
  const datum = new Date(start);
  const formatted = datum.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const uhrzeit = datum.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#ef4444;padding:32px 40px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:24px">Buchung abgelehnt ✕</h1>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="font-size:16px;color:#333;margin:0 0 8px">Hallo ${name},</p>
<p style="font-size:16px;color:#555;margin:0 0 24px;line-height:1.5">leider konnte deine Buchung für den folgenden Termin nicht bestätigt werden.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px">
<tr><td style="padding:4px 0">
<span style="color:#666;font-size:13px">Service</span>
<p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:2px 0">${service}</p>
</td></tr>
<tr><td style="padding:4px 0">
<span style="color:#666;font-size:13px">Gewünschter Termin</span>
<p style="color:#1a1a1a;font-size:15px;font-weight:600;margin:2px 0">${formatted} um ${uhrzeit}</p>
</td></tr>
</table>

<p style="font-size:14px;color:#666;line-height:1.5;margin:0">Du kannst gerne einen neuen Termin über unsere Webseite buchen.</p>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

<p style="font-size:12px;color:#999;margin:0">Autoaufbereitung</p>

</td></tr></table>
<p style="font-size:12px;color:#999;margin-top:16px">Autoaufbereitung</p>
</td></tr></table>
</body>
</html>`;

  ensureInit();
  await sgMail.send({
    to,
    from: SENDGRID_FROM,
    subject: "Deine Buchung wurde abgelehnt",
    html,
  });
}

export async function sendAdminNewMessageNotification({
  adminEmail,
  customerName,
  bookingUid,
  service,
  text,
  start,
  accessToken,
}: {
  adminEmail: string;
  customerName: string;
  bookingUid: string;
  service: string;
  text: string;
  start?: string;
  accessToken?: string;
}) {
  const datum = start
    ? new Date(start).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "";
  const uhrzeit = start
    ? new Date(start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:0">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
<tr><td style="background:#2563eb;padding:32px 40px;text-align:center">
<h1 style="color:#fff;margin:0;font-size:24px">Neue Nachricht von ${customerName}</h1>
</td></tr>
<tr><td style="padding:32px 40px">
<p style="font-size:14px;color:#666;margin:0 0 4px">Buchung</p>
<p style="font-size:16px;color:#1a1a1a;font-weight:600;margin:0 0 4px">${service}</p>
${datum ? `<p style="font-size:14px;color:#555;margin:0 0 2px">${datum} um ${uhrzeit}</p>` : ""}
<p style="font-size:13px;color:#999;margin:0 0 20px">ID: ${bookingUid}</p>

<div style="background:#f3f4f6;border-radius:12px;padding:16px 20px;margin-bottom:24px">
<p style="font-size:15px;color:#333;margin:0;white-space:pre-wrap">${text}</p>
</div>

<a href="https://autoaufbereitung-booking.vercel.app/admin/${bookingUid}${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ""}" style="display:block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 24px;border-radius:10px;font-size:16px;font-weight:600;text-align:center;margin-bottom:20px">
Zur Buchung →</a>

${accessToken ? `
<div style="text-align:center;margin-bottom:20px">
<a href="https://autoaufbereitung-booking.vercel.app/termin/${bookingUid}?token=${encodeURIComponent(accessToken)}" style="color:#059669;font-size:14px;text-decoration:underline">
Kundenansicht öffnen ↗
</a>
</div>` : ""}

<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">

<p style="font-size:12px;color:#999;margin:0">
<a href="https://autoaufbereitung-booking.vercel.app/admin/${bookingUid}${accessToken ? `?token=${encodeURIComponent(accessToken)}` : ""}" style="color:#2563eb">${bookingUid}</a></p>

</td></tr></table>
<p style="font-size:12px;color:#999;margin-top:16px">Autoaufbereitung</p>
</td></tr></table>
</body>
</html>`;

  ensureInit();
  await sgMail.send({
    to: adminEmail,
    from: SENDGRID_FROM,
    subject: `Neue Nachricht von ${customerName}`,
    html,
  });
}
