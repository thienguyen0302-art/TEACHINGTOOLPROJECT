import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getSmtpConfig, createTransporter } from './bugReportEmail.js';

export const EMAIL_SUBJECTS = {
  resetPassword: 'PeanutCode - Yêu cầu đặt lại mật khẩu tài khoản',
  verifyEmail: 'PeanutCode - Xác minh địa chỉ email tài khoản của bạn',
};

/**
 * Biểu mẫu HTML chuyên nghiệp cho email Đặt lại mật khẩu / Quên mật khẩu.
 * Xưng là PeanutCode, đặt tựa và nhận diện thương hiệu PeanutCode rõ ràng.
 */
export function buildPasswordResetHtml({ resetLink, email }) {
  const currentYear = new Date().getFullYear();
  const safeEmail = email || 'bạn';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PeanutCode &mdash; Đặt lại mật khẩu</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08),0 8px 10px -6px rgba(15,23,42,0.04);border:1px solid #e2e8f0;">
        
        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#3b82f6 100%);padding:32px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td valign="middle">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="padding-right:12px;font-size:32px;line-height:1;vertical-align:middle;">&#x1F95C;</td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1;display:inline-block;">PeanutCode</span>
                        <p style="margin:4px 0 0;font-size:12px;color:#bfdbfe;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Nền tảng luyện thi Tin học HSG</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:6px 14px;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.8px;text-transform:uppercase;">&#x1F511; Đặt lại mật khẩu</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <h1 style="margin:0 0 18px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.4;">
              Yêu cầu đặt lại mật khẩu tài khoản
            </h1>

            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
              Chào bạn,
            </p>

            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
              <strong>PeanutCode</strong> nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong style="color:#1d4ed8;">${safeEmail}</strong> trên hệ thống học tập PeanutCode.
            </p>

            <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#334155;">
              Để thiết lập mật khẩu mới và tiếp tục luyện tập thuật toán, bạn vui lòng nhấn vào nút bên dưới:
            </p>

            <!-- ACTION BUTTON -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${resetLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(37,99,235,0.35);letter-spacing:0.3px;">
                    Đặt Lại Mật Khẩu Ngay &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- FALLBACK LINK -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
                    Nếu nút bấm không hoạt động, bạn hãy sao chép liên kết này vào trình duyệt:
                  </p>
                  <p style="margin:0;font-size:12px;color:#2563eb;word-break:break-all;line-height:1.5;">
                    <a href="${resetLink}" style="color:#2563eb;text-decoration:underline;">${resetLink}</a>
                  </p>
                </td>
              </tr>
            </table>

            <!-- SECURITY BOX -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td style="background:#fffbeb;border:1px solid #fde68a;border-left:4px solid #f59e0b;border-radius:0 10px 10px 0;padding:14px 18px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;">
                    &#x1F6E1; Lưu ý an toàn từ PeanutCode:
                  </p>
                  <ul style="margin:0;padding-left:18px;font-size:13px;color:#92400e;line-height:1.6;">
                    <li>Liên kết này chỉ có hiệu lực trong vòng <strong>60 phút</strong> và chỉ sử dụng được <strong>01 lần</strong>.</li>
                    <li>Nếu bạn <strong>không</strong> gửi yêu cầu này, xin hãy yên tâm vì tài khoản của bạn tại <strong>PeanutCode</strong> vẫn được bảo mật an toàn. Bạn hoàn toàn có thể bỏ qua thư này.</li>
                    <li>Tuyệt đối không gửi liên kết trên cho bất kỳ ai để đảm bảo an toàn cho tài khoản.</li>
                  </ul>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">
              Chúc bạn có những trải nghiệm học tập và rèn luyện hiệu quả cùng PeanutCode!
            </p>

            <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">
              Thân mến,<br />
              <strong style="color:#0f172a;">Đội ngũ PeanutCode</strong><br />
              <span style="font-size:13px;color:#64748b;">Nền tảng Luyện thi Tin học & Chấm điểm Tự động HSG</span>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:22px 36px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;line-height:1.5;">
              Email này được gửi tự động từ hệ thống học tập <strong>PeanutCode</strong>.
            </p>
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              &copy; ${currentYear} PeanutCode. Mọi quyền được bảo lưu.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Biểu mẫu HTML chuyên nghiệp cho email Xác minh tài khoản / Email verification.
 * Xưng là PeanutCode, đặt tựa và nhận diện thương hiệu PeanutCode rõ ràng.
 */
export function buildEmailVerificationHtml({ verifyLink, email }) {
  const currentYear = new Date().getFullYear();
  const safeEmail = email || 'bạn';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PeanutCode &mdash; Xác minh địa chỉ email</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1e293b;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:40px 16px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(15,23,42,0.08),0 8px 10px -6px rgba(15,23,42,0.04);border:1px solid #e2e8f0;">
        
        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 55%,#3b82f6 100%);padding:32px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td valign="middle">
                  <table cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td style="padding-right:12px;font-size:32px;line-height:1;vertical-align:middle;">&#x1F95C;</td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1;display:inline-block;">PeanutCode</span>
                        <p style="margin:4px 0 0;font-size:12px;color:#bfdbfe;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Nền tảng luyện thi Tin học HSG</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" valign="middle">
                  <span style="display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:6px 14px;font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.8px;text-transform:uppercase;">&#x2728; Xác minh tài khoản</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <h1 style="margin:0 0 18px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.4;">
              Chào mừng bạn gia nhập PeanutCode!
            </h1>

            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
              Chào bạn,
            </p>

            <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
              <strong>PeanutCode</strong> rất vui mừng được chào đón bạn đến với nền tảng học tập và luyện thi Tin học. Để bảo vệ tài khoản liên kết với địa chỉ email <strong style="color:#1d4ed8;">${safeEmail}</strong> và bắt đầu giải bài tập, tham gia chấm điểm tự động cũng như các kỳ thi HSG, bạn vui lòng kích hoạt tài khoản bằng cách nhấn vào nút bên dưới:
            </p>

            <!-- ACTION BUTTON -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;">
              <tr>
                <td align="center">
                  <a href="${verifyLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:linear-gradient(135deg,#059669 0%,#10b981 100%);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;box-shadow:0 4px 14px rgba(16,185,129,0.35);letter-spacing:0.3px;">
                    Xác Minh Email Của Tôi &rarr;
                  </a>
                </td>
              </tr>
            </table>

            <!-- FALLBACK LINK -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">
                    Nếu nút bấm không hoạt động, bạn hãy sao chép liên kết này vào trình duyệt:
                  </p>
                  <p style="margin:0;font-size:12px;color:#2563eb;word-break:break-all;line-height:1.5;">
                    <a href="${verifyLink}" style="color:#2563eb;text-decoration:underline;">${verifyLink}</a>
                  </p>
                </td>
              </tr>
            </table>

            <!-- NOTES BOX -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #3b82f6;border-radius:0 10px 10px 0;padding:14px 18px;">
                  <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.5px;">
                    &#x1F4DD; Thông tin từ PeanutCode:
                  </p>
                  <ul style="margin:0;padding-left:18px;font-size:13px;color:#1e3a8a;line-height:1.6;">
                    <li>Liên kết xác nhận này có hiệu lực trong vòng <strong>24 giờ</strong>.</li>
                    <li>Sau khi xác minh thành công, bạn có thể đăng nhập và trải nghiệm toàn bộ các khoá học C++/Python, nộp bài Judge0 và tương tác cùng AI Tutor.</li>
                    <li>Nếu bạn không thực hiện đăng ký tại <strong>PeanutCode</strong>, xin vui lòng bỏ qua email này.</li>
                  </ul>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">
              Chúc bạn có những giờ học bổ ích và tự tin chinh phục các kỳ thi Tin học cùng PeanutCode!
            </p>

            <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">
              Thân mến,<br />
              <strong style="color:#0f172a;">Đội ngũ PeanutCode</strong><br />
              <span style="font-size:13px;color:#64748b;">Nền tảng Luyện thi Tin học & Chấm điểm Tự động HSG</span>
            </p>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:22px 36px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;line-height:1.5;">
              Email này được gửi tự động từ hệ thống học tập <strong>PeanutCode</strong>.
            </p>
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              &copy; ${currentYear} PeanutCode. Mọi quyền được bảo lưu.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/**
 * Lấy Admin Auth instance an toàn từ firebase-admin.
 */
export function getAdminAuth() {
  try {
    const app = getApps()[0] ?? initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    return getAuth(app);
  } catch {
    return null;
  }
}

/**
 * Handler HTTP cho việc tạo link và gửi email auth từ backend.
 */
export function createAuthEmailHandler({
  adminAuth = null,
  getSmtp = getSmtpConfig,
  transportFactory = createTransporter,
  appOrigin = process.env.APP_ORIGIN || 'http://localhost:5173',
} = {}) {
  return async function authEmailHandler(req, res) {
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
      return reply(405, { error: 'Phương thức không được hỗ trợ.' });
    }

    const isReset = req.url.split('?')[0] === '/api/auth/send-reset-password';
    const isVerify = req.url.split('?')[0] === '/api/auth/send-verification';

    if (!isReset && !isVerify) {
      return reply(404, { error: 'Không tìm thấy API xác thực thư.' });
    }

    let chunks = [];
    let size = 0;
    try {
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 20000) {
          return reply(413, { error: 'Yêu cầu vượt quá dung lượng cho phép.' });
        }
        chunks.push(chunk);
      }
    } catch {
      return reply(400, { error: 'Không đọc được dữ liệu gửi lên.' });
    }

    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return reply(400, { error: 'Dữ liệu JSON không hợp lệ.' });
    }

    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(400, { error: 'Địa chỉ email không hợp lệ.' });
    }

    const smtp = getSmtp();
    if (!smtp.user || !smtp.pass) {
      return reply(503, {
        error: 'Máy chủ chưa cấu hình SMTP để gửi thư trực tiếp từ PeanutCode.',
        fallback: true,
      });
    }

    const resolvedAuth = adminAuth || getAdminAuth();
    if (!resolvedAuth) {
      return reply(503, {
        error: 'Chưa khởi tạo được Firebase Admin SDK để tạo liên kết bảo mật.',
        fallback: true,
      });
    }

    const origin = body?.origin || req.headers.origin || appOrigin;
    const actionCodeSettings = {
      url: `${origin}/login`,
      handleCodeInApp: false,
    };

    let actionLink;
    try {
      if (isReset) {
        actionLink = await resolvedAuth.generatePasswordResetLink(email, actionCodeSettings);
      } else {
        actionLink = await resolvedAuth.generateEmailVerificationLink(email, actionCodeSettings);
      }
    } catch (err) {
      return reply(400, {
        error: err.message || 'Không thể tạo liên kết bảo mật cho email này.',
        code: err.code,
        fallback: true,
      });
    }

    const transporter = transportFactory(smtp.user, smtp.pass);
    if (!transporter) {
      return reply(503, {
        error: 'Không khởi tạo được dịch vụ gửi thư SMTP.',
        fallback: true,
      });
    }

    const mailOptions = {
      from: `"PeanutCode" <${smtp.user}>`,
      to: email,
      subject: isReset ? EMAIL_SUBJECTS.resetPassword : EMAIL_SUBJECTS.verifyEmail,
      html: isReset
        ? buildPasswordResetHtml({ resetLink: actionLink, email })
        : buildEmailVerificationHtml({ verifyLink: actionLink, email }),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      return reply(200, {
        ok: true,
        message: isReset
          ? 'Đã gửi email đặt lại mật khẩu với giao diện PeanutCode thành công!'
          : 'Đã gửi email xác minh tài khoản với giao diện PeanutCode thành công!',
        messageId: info?.messageId,
      });
    } catch (sendErr) {
      return reply(500, {
        error: `Lỗi khi gửi email qua SMTP: ${sendErr.message}`,
        fallback: true,
      });
    }
  };
}
