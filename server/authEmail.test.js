import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMAIL_SUBJECTS,
  buildPasswordResetHtml,
  buildEmailVerificationHtml,
  createAuthEmailHandler,
} from './authEmail.js';

test('buildPasswordResetHtml chứa thương hiệu PeanutCode và không chứa noreply', () => {
  const html = buildPasswordResetHtml({
    resetLink: 'https://peanutcode.edu.vn/__/auth/action?mode=resetPassword&oobCode=123',
    email: 'student@example.com',
  });

  assert.ok(html.includes('PeanutCode'), 'HTML phải chứa thương hiệu PeanutCode');
  assert.ok(html.includes('student@example.com'), 'HTML phải chứa email học sinh');
  assert.ok(html.includes('https://peanutcode.edu.vn/__/auth/action?mode=resetPassword&oobCode=123'), 'HTML phải chứa link đặt lại mật khẩu');
  assert.ok(html.includes('Đặt Lại Mật Khẩu Ngay'), 'HTML phải có nút kêu gọi hành động');
  assert.ok(html.includes('Lưu ý an toàn từ PeanutCode'), 'HTML phải có hộp lưu ý an toàn xưng PeanutCode');
  assert.ok(!html.toLowerCase().includes('noreply'), 'Không được xưng là noreply trong template');
  assert.equal(EMAIL_SUBJECTS.resetPassword, 'PeanutCode - Yêu cầu đặt lại mật khẩu tài khoản');
});

test('buildEmailVerificationHtml chứa thương hiệu PeanutCode và lời xưng hô PeanutCode', () => {
  const html = buildEmailVerificationHtml({
    verifyLink: 'https://peanutcode.edu.vn/__/auth/action?mode=verifyEmail&oobCode=456',
    email: 'newuser@example.com',
  });

  assert.ok(html.includes('PeanutCode'), 'HTML phải chứa thương hiệu PeanutCode');
  assert.ok(html.includes('newuser@example.com'), 'HTML phải chứa email');
  assert.ok(html.includes('https://peanutcode.edu.vn/__/auth/action?mode=verifyEmail&oobCode=456'), 'HTML phải chứa link xác minh');
  assert.ok(html.includes('Xác Minh Email Của Tôi'), 'HTML phải có nút kêu gọi hành động');
  assert.ok(html.includes('<strong>PeanutCode</strong> rất vui mừng'), 'HTML phải xưng danh PeanutCode');
  assert.ok(!html.toLowerCase().includes('noreply'), 'Không được xưng là noreply trong template');
  assert.equal(EMAIL_SUBJECTS.verifyEmail, 'PeanutCode - Xác minh địa chỉ email tài khoản của bạn');
});

test('createAuthEmailHandler: từ chối email không hợp lệ hoặc method không phải POST', async () => {
  const handler = createAuthEmailHandler();

  // Test method GET
  let resStatus = 0;
  let resData = null;
  const mockRes = {
    writeHead: (s) => { resStatus = s; },
    end: (d) => { resData = JSON.parse(d); },
  };

  await handler({ method: 'GET', url: '/api/auth/send-reset-password' }, mockRes);
  assert.equal(resStatus, 405);
  assert.ok(resData.error);

  // Test invalid email
  const badReq = {
    method: 'POST',
    url: '/api/auth/send-reset-password',
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ email: 'invalid-email' }));
    },
  };
  await handler(badReq, mockRes);
  assert.equal(resStatus, 400);
  assert.ok(resData.error.includes('không hợp lệ'));
});

test('createAuthEmailHandler: gửi email đặt lại mật khẩu thành công với sender PeanutCode', async () => {
  let sentMail = null;
  const mockAdminAuth = {
    generatePasswordResetLink: async (email, settings) => {
      return `https://peanutcode.edu.vn/reset?email=${encodeURIComponent(email)}&url=${encodeURIComponent(settings.url)}`;
    },
  };
  const mockTransporter = {
    sendMail: async (opts) => {
      sentMail = opts;
      return { messageId: 'test-msg-id-123' };
    },
  };

  const handler = createAuthEmailHandler({
    adminAuth: mockAdminAuth,
    getSmtp: () => ({ user: 'support@peanutcode.edu.vn', pass: 'secretpass' }),
    transportFactory: () => mockTransporter,
    appOrigin: 'https://peanutcode.edu.vn',
  });

  let resStatus = 0;
  let resData = null;
  const mockRes = {
    writeHead: (s) => { resStatus = s; },
    end: (d) => { resData = JSON.parse(d); },
  };

  const req = {
    method: 'POST',
    url: '/api/auth/send-reset-password',
    headers: { origin: 'https://peanutcode.edu.vn' },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ email: 'student@peanutcode.edu.vn' }));
    },
  };

  await handler(req, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resData.ok, true);
  assert.ok(sentMail);
  assert.equal(sentMail.from, '"PeanutCode" <support@peanutcode.edu.vn>');
  assert.equal(sentMail.to, 'student@peanutcode.edu.vn');
  assert.equal(sentMail.subject, 'PeanutCode - Yêu cầu đặt lại mật khẩu tài khoản');
  assert.ok(sentMail.html.includes('student@peanutcode.edu.vn'));
  assert.ok(sentMail.html.includes('PeanutCode'));
});

test('createAuthEmailHandler: gửi email xác minh thành công với sender PeanutCode', async () => {
  let sentMail = null;
  const mockAdminAuth = {
    generateEmailVerificationLink: async (email) => {
      return `https://peanutcode.edu.vn/verify?email=${encodeURIComponent(email)}`;
    },
  };
  const mockTransporter = {
    sendMail: async (opts) => {
      sentMail = opts;
      return { messageId: 'test-verify-id-456' };
    },
  };

  const handler = createAuthEmailHandler({
    adminAuth: mockAdminAuth,
    getSmtp: () => ({ user: 'support@peanutcode.edu.vn', pass: 'secretpass' }),
    transportFactory: () => mockTransporter,
    appOrigin: 'https://peanutcode.edu.vn',
  });

  let resStatus = 0;
  let resData = null;
  const mockRes = {
    writeHead: (s) => { resStatus = s; },
    end: (d) => { resData = JSON.parse(d); },
  };

  const req = {
    method: 'POST',
    url: '/api/auth/send-verification',
    headers: { origin: 'https://peanutcode.edu.vn' },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ email: 'newmember@peanutcode.edu.vn' }));
    },
  };

  await handler(req, mockRes);
  assert.equal(resStatus, 200);
  assert.equal(resData.ok, true);
  assert.ok(sentMail);
  assert.equal(sentMail.from, '"PeanutCode" <support@peanutcode.edu.vn>');
  assert.equal(sentMail.to, 'newmember@peanutcode.edu.vn');
  assert.equal(sentMail.subject, 'PeanutCode - Xác minh địa chỉ email tài khoản của bạn');
  assert.ok(sentMail.html.includes('Xác Minh Email Của Tôi'));
  assert.ok(sentMail.html.includes('PeanutCode'));
});
