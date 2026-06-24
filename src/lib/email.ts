import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend {
  if (!resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY must be set");
    resend = new Resend(key);
  }
  return resend;
}

export async function sendBookingConfirmation({
  to,
  name,
  service,
  start,
  terminLink,
  shortLink,
}: {
  to: string;
  name: string;
  service: string;
  start: string;
  terminLink: string;
  shortLink: string;
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

  const { error } = await getResend().emails.send({
    from: "Autoaufbereitung <buchung@autoaufbereitung.de>",
    to,
    subject: "Deine Buchung ist bestätigt",
    html,
  });

  if (error) {
    console.error("Resend error:", error);
  }
}
