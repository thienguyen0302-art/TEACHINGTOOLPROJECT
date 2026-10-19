import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';

export const DEFAULT_PUBLISHER_EMAIL = 'lythuy84@gmail.com';

export function reloadEnv() {
  for (const envFile of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            process.env[key] = val;
          }
        }
      } catch {
        // ignore error
      }
    }
  }
}

export function getSmtpConfig() {
  reloadEnv();

  const user =
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    process.env.MAIL_USER ||
    process.env.EMAIL_USER;

  const pass =
    process.env.SMTP_PASS ||
    process.env.GMAIL_PASS ||
    process.env.MAIL_PASS ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_APP_PASSWORD;

  const recipient =
    process.env.PUBLISHER_EMAIL ||
    process.env.RECEIVER_EMAIL ||
    process.env.ADMIN_EMAIL ||
    DEFAULT_PUBLISHER_EMAIL;

  return { user, pass, recipient };
}

export function createTransporter(user, pass) {
  if (!user || !pass) {
    return null;
  }

  // Remove any whitespace from app password
  const cleanPass = pass.replace(/\s+/g, '');

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass: cleanPass },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass: cleanPass },
  });
}

/**
 * Tạo HTML email chuyên nghiệp theo thương hiệu PeanutCode.
 */
function buildBugReportHtml({ title, description, stepsToReproduce, category, severityLabel, severityColor, displayName, email, systemInfo, recipient }) {
  const sentAt = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const pageUrl = systemInfo.url || 'N/A';
  const userAgent = systemInfo.userAgent || 'N/A';
  const resolution = systemInfo.screenResolution || 'N/A';

  const emailLink = email
    ? `<a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a>`
    : '<em style="color:#94a3b8;">Ch&#432;a cung c&#7845;p</em>';

  const stepsBlock = stepsToReproduce ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 18px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#d97706;letter-spacing:1px;text-transform:uppercase;">&#128257; C&Aacute;C B&#431;&Ocirc;&#769;C T&Aacute;I HI&#7878;N</p>
          <p style="margin:0;font-size:13px;color:#78350f;line-height:1.7;white-space:pre-wrap;">${stepsToReproduce}</p>
        </td>
      </tr>
    </table>` : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PeanutCode &mdash; B&aacute;o C&aacute;o S&#7921; C&#7889;</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0f4f8;padding:36px 16px;">
  <tr>
    <td align="center">
      <table width="620" cellpadding="0" cellspacing="0" role="presentation" style="max-width:620px;width:100%;">

        <!-- ══ HEADER ══ -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#3b82f6 100%);border-radius:16px 16px 0 0;padding:30px 36px 26px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td valign="middle">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="padding-right:10px;font-size:28px;line-height:1;vertical-align:middle;">&#x1F95C;</td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1;">PeanutCode</span>
                        <p style="margin:3px 0 0;font-size:11px;color:#93c5fd;font-weight:600;letter-spacing:2px;text-transform:uppercase;">N&#7873;n t&#7843;ng luy&#7879;n thi Tin h&#7885;c HSG</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.28);border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;color:#dbeafe;letter-spacing:1px;text-transform:uppercase;">&#128276; B&Aacute;O L&#7�;I / G&Oacute;P &Yacute;</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ SEVERITY BANNER ══ -->
        <tr>
          <td style="background:${severityColor};padding:10px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                  &#9889; M&#7�;C &#272;&#7928;: ${severityLabel.toUpperCase()}
                </td>
                <td align="right" style="color:rgba(255,255,255,0.85);font-size:12px;white-space:nowrap;">
                  ${sentAt}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ BODY ══ -->
        <tr>
          <td style="background:#ffffff;padding:30px 36px 4px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

            <!-- Title + category -->
            <h1 style="margin:0 0 6px;font-size:21px;font-weight:800;color:#0f172a;line-height:1.3;">${title}</h1>
            <p style="margin:0 0 24px;font-size:13px;color:#64748b;">
              Ph&#226;n lo&#7841;i: <strong style="color:#334155;background:#f1f5f9;padding:2px 8px;border-radius:4px;font-size:12px;">${category}</strong>
            </p>

            <!-- Description -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <td style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:0 8px 8px 0;padding:16px 18px;">
                  <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#2563eb;letter-spacing:1px;text-transform:uppercase;">&#128203; M&Ocirc; T&#7842; S&#7920; C&#7896;</p>
                  <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.75;white-space:pre-wrap;">${description}</p>
                </td>
              </tr>
            </table>

            ${stepsBlock}

            <!-- Sender -->
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">&#128100; NG&#431;&#416;&#768;I G&#7904;I</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;font-size:13px;margin-bottom:24px;">
              <tr>
                <td style="padding:11px 16px;background:#f8fafc;color:#64748b;width:140px;border-bottom:1px solid #f1f5f9;font-weight:600;">T&#234;n ng&#432;&#7901;i g&#7917;i</td>
                <td style="padding:11px 16px;background:#f8fafc;color:#0f172a;font-weight:700;border-bottom:1px solid #f1f5f9;">${displayName}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;color:#64748b;border-bottom:1px solid #f1f5f9;font-weight:600;">Email</td>
                <td style="padding:11px 16px;color:#2563eb;border-bottom:1px solid #f1f5f9;">${emailLink}</td>
              </tr>
              <tr>
                <td style="padding:11px 16px;background:#f8fafc;color:#64748b;font-weight:600;">Trang b&aacute;o l&#7895;i</td>
                <td style="padding:11px 16px;background:#f8fafc;word-break:break-all;"><a href="${pageUrl === 'N/A' ? '#' : pageUrl}" style="color:#2563eb;font-size:12px;text-decoration:none;">${pageUrl}</a></td>
              </tr>
            </table>

            <!-- System info -->
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">&#128421;&#65039; M&Ocirc;I TR&#431;&#7906;NG K&#7�; THU&#7854;T</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;font-size:12px;margin-bottom:30px;">
              <tr>
                <td style="padding:10px 16px;background:#f8fafc;color:#64748b;width:140px;border-bottom:1px solid #f1f5f9;font-weight:600;">Tr&igrave;nh duy&#7879;t</td>
                <td style="padding:10px 16px;background:#f8fafc;color:#475569;border-bottom:1px solid #f1f5f9;word-break:break-word;">${userAgent}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;color:#64748b;font-weight:600;">&#272;&#7897; ph&#226;n gi&#7843;i</td>
                <td style="padding:10px 16px;color:#475569;">${resolution}</td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ══ FOOTER ══ -->
        <tr>
          <td style="background:#1e293b;border-radius:0 0 16px 16px;padding:22px 36px;border:1px solid #334155;border-top:none;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td valign="middle">
                  <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#f1f5f9;">&#x1F95C; PeanutCode</p>
                  <p style="margin:0;font-size:11px;color:#64748b;line-height:1.6;">
                    N&#7873;n t&#7843;ng luy&#7879;n thi Tin h&#7885;c HSG &mdash; THCS &amp; THPT<br/>
                    Email g&#7917;i t&#7921; &#273;&#7897;ng, vui l&ograve;ng kh&ocirc;ng tr&#7843; l&#7901;i tr&#7921;c ti&#7871;p.
                  </p>
                </td>
                <td align="right" valign="middle" style="padding-left:16px;white-space:nowrap;">
                  <p style="margin:0;font-size:11px;color:#475569;text-align:right;line-height:1.5;">
                    G&#7917;i t&#7899;i<br/>
                    <strong style="color:#94a3b8;font-size:12px;">${recipient}</strong>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr><td style="height:28px;"></td></tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function createBugReportEmailHandler() {
  return async function handleBugReportEmail(req, res) {
    const reply = (status, data) => {
      if (!res.destroyed) {
        res.writeHead(status, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify(data));
      }
    };

    if (req.method !== 'POST') {
      return reply(405, { error: 'Method not allowed' });
    }

    let body;
    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 100000) {
          return reply(413, { error: 'Dữ liệu quá lớn' });
        }
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return reply(400, { error: 'JSON không hợp lệ' });
    }

    const {
      title,
      description,
      stepsToReproduce = '',
      category = 'judge',
      severity = 'medium',
      displayName = 'Học viên',
      email = '',
      systemInfo = {},
    } = body || {};

    if (!title?.trim() || !description?.trim()) {
      return reply(400, { error: 'Thiếu thông tin tiêu đề hoặc mô tả sự cố' });
    }

    const { user, pass, recipient } = getSmtpConfig();
    const transporter = createTransporter(user, pass);

    console.log(`[BugReport Email] Nhận báo lỗi mới: "${title}" từ "${displayName}" (${email || 'không có email'})`);

    if (!transporter) {
      const msg = `Chưa tìm thấy cấu hình SMTP_USER và SMTP_PASS trong .env.local để gửi mail. Hãy kiểm tra lại tệp .env.local.`;
      console.warn(`[BugReport Email] ${msg}`);
      return reply(400, {
        ok: false,
        sent: false,
        error: msg,
        recipient,
      });
    }

    const severityColor =
      severity === 'critical' ? '#dc2626'
      : severity === 'high'   ? '#ea580c'
      : severity === 'medium' ? '#2563eb'
      :                         '#64748b';

    const severityLabel =
      severity === 'critical' ? 'Khẩn cấp'
      : severity === 'high'   ? 'Cao'
      : severity === 'medium' ? 'Trung bình'
      :                         'Thấp';

    const htmlBody = buildBugReportHtml({
      title, description, stepsToReproduce, category,
      severityLabel, severityColor,
      displayName, email, systemInfo, recipient,
    });

    const mailOptions = {
      from: `"PeanutCode" <${user}>`,
      to: recipient,
      replyTo: email || undefined,
      subject: `[PeanutCode] [${severityLabel.toUpperCase()}] Báo lỗi: ${title}`,
      text:
        `BÁO CÁO SỰ CỐ & GÓP Ý KỸ THUẬT — PEANUTCODE\n` +
        `Người phát hành: ${recipient}\n\n` +
        `Người gửi: ${displayName} (${email || 'Chưa cung cấp email'})\n` +
        `Phân loại: ${category}\n` +
        `Mức độ: ${severityLabel}\n` +
        `Tiêu đề: ${title}\n\n` +
        `Mô tả:\n${description}\n\n` +
        (stepsToReproduce ? `Các bước tái hiện:\n${stepsToReproduce}\n\n` : '') +
        `Thông tin môi trường:\n` +
        `- URL: ${systemInfo.url || 'N/A'}\n` +
        `- Trình duyệt: ${systemInfo.userAgent || 'N/A'}\n` +
        `- Màn hình: ${systemInfo.screenResolution || 'N/A'}\n`,
      html: htmlBody,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[BugReport Email] Đã gửi mail thành công đến ${recipient}:`, info.messageId);
      return reply(200, {
        ok: true,
        sent: true,
        recipient,
        messageId: info.messageId,
      });
    } catch (err) {
      console.error(`[BugReport Email] Gặp lỗi khi gửi email qua SMTP:`, err.message);
      return reply(500, {
        ok: false,
        sent: false,
        error: `Lỗi kết nối máy chủ gửi mail: ${err.message}`,
      });
    }
  };
}
