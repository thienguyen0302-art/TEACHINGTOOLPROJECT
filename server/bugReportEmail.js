import nodemailer from 'nodemailer';

export const PUBLISHER_EMAIL = process.env.PUBLISHER_EMAIL || 'lythuy84@gmail.com';

function createTransporter() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  // If host is specified, use custom SMTP, otherwise default to Gmail service
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
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

    if (!title || !description) {
      return reply(400, { error: 'Thiếu thông tin tiêu đề hoặc mô tả sự cố' });
    }

    const transporter = createTransporter();
    const recipient = PUBLISHER_EMAIL;

    console.log(`[BugReport Email] Nhận báo lỗi mới: "${title}" từ "${displayName}" (${email || 'không có email'})`);

    if (!transporter) {
      console.log(
        `[BugReport Email] Chưa cấu hình SMTP_USER / SMTP_PASS trong .env.local. Để tự động bắn email tới ${recipient}, hãy thêm tài khoản Gmail và App Password vào .env.local.`
      );
      return reply(200, {
        ok: true,
        sent: false,
        reason: 'smtp_not_configured',
        recipient,
        message: `Báo cáo đã được lưu vào hệ thống. SMTP server chưa cấu hình credentials gửi mail tự động đến ${recipient}.`,
      });
    }

    const severityColor =
      severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ea580c' : severity === 'medium' ? '#2563eb' : '#64748b';
    const severityLabel =
      severity === 'critical' ? 'Khẩn cấp' : severity === 'high' ? 'Cao' : severity === 'medium' ? 'Trung bình' : 'Thấp';

    const mailOptions = {
      from: `"PeanutCode Báo Lỗi" <${process.env.SMTP_USER || process.env.GMAIL_USER}>`,
      to: recipient,
      replyTo: email || undefined,
      subject: `[PeanutCode Báo Lỗi] [${severityLabel.toUpperCase()}] ${title}`,
      text:
        `BÁO CÁO SỰ CỐ & GÓP Ý KỸ THUẬT PEANUTCODE\n` +
        `Người phát hành: Cô Lý Thị Thanh Thúy (${recipient})\n\n` +
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
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1e3a8a; font-size: 20px;">PeanutCode — Báo Cáo Sự Cố & Góp Ý Kỹ Thuật</h2>
            <p style="margin: 6px 0 0; color: #64748b; font-size: 13px;">Gửi tới Người phát hành nền tảng: <strong>Cô Lý Thị Thanh Thúy</strong> (<code>${recipient}</code>)</p>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; background: ${severityColor}15; color: ${severityColor}; border: 1px solid ${severityColor}40;">
              Mức độ: ${severityLabel}
            </div>
            <div style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background: #f1f5f9; color: #475569; margin-left: 8px;">
              Phân loại: ${category}
            </div>
          </div>

          <h3 style="margin: 0 0 12px; color: #0f172a; font-size: 18px;">${title}</h3>

          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; margin-bottom: 18px;">
            <strong style="display: block; color: #334155; font-size: 13px; margin-bottom: 6px;">Mô tả chi tiết sự cố:</strong>
            <p style="margin: 0; color: #1e293b; font-size: 14px; white-space: pre-wrap; line-height: 1.6;">${description}</p>
          </div>

          ${
            stepsToReproduce
              ? `
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 4px; margin-bottom: 18px;">
            <strong style="display: block; color: #92400e; font-size: 13px; margin-bottom: 6px;">Các bước tái hiện:</strong>
            <p style="margin: 0; color: #78350f; font-size: 13px; white-space: pre-wrap; line-height: 1.5;">${stepsToReproduce}</p>
          </div>
          `
              : ''
          }

          <table style="width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b; width: 140px;">Người gửi:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${displayName} ${email ? `(&lt;${email}&gt;)` : ''}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Thời gian gửi:</td>
              <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleString('vi-VN')}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Trang gửi lỗi:</td>
              <td style="padding: 8px 0; color: #2563eb; word-break: break-all;">${systemInfo.url || 'N/A'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 8px 0; color: #64748b;">Trình duyệt:</td>
              <td style="padding: 8px 0; color: #475569; font-size: 12px;">${systemInfo.userAgent || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Độ phân giải:</td>
              <td style="padding: 8px 0; color: #475569;">${systemInfo.screenResolution || 'N/A'}</td>
            </tr>
          </table>

          <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
            Email gửi tự động từ PeanutCode · Nền tảng học Tin học HSG dành cho THCS & THPT
          </div>
        </div>
      `,
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
        error: err.message,
      });
    }
  };
}
