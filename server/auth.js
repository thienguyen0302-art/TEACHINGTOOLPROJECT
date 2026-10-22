import { createPublicKey, createVerify } from 'node:crypto';
import { Buffer } from 'node:buffer';

// Xác thực Firebase ID token không cần firebase-admin: kiểm tra chữ ký RS256 bằng chứng chỉ công khai của Google.
const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_MS = 60_000;
let cache = { keys: null, expires: 0 };

export async function fetchGoogleKeys(fetchImpl = fetch) {
  if (cache.keys && Date.now() < cache.expires) return cache.keys;
  const response = await fetchImpl(CERT_URL);
  if (!response.ok) throw new Error('Không tải được khóa xác thực Google.');
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1]) || 3600;
  cache = { keys: await response.json(), expires: Date.now() + maxAge * 1000 };
  return cache.keys;
}

const parseJson = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

export async function verifyIdToken(token, { projectId, getKeys = fetchGoogleKeys, now = Date.now() }) {
  const parts = typeof token === 'string' ? token.split('.') : [];
  if (parts.length !== 3) throw new Error('Token không hợp lệ.');
  let header, payload;
  try { header = parseJson(parts[0]); payload = parseJson(parts[1]); }
  catch { throw new Error('Token không hợp lệ.'); }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw new Error('Token không hợp lệ.');
  const pem = (await getKeys())[header.kid];
  if (!pem) throw new Error('Token không hợp lệ.');
  const valid = createVerify('RSA-SHA256').update(`${parts[0]}.${parts[1]}`)
    .verify(createPublicKey(pem), Buffer.from(parts[2], 'base64url'));
  if (!valid) throw new Error('Chữ ký token không hợp lệ.');
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Token thuộc dự án khác.');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Token không hợp lệ.');
  if (!(payload.exp * 1000 > now)) throw new Error('Token đã hết hạn.');
  if (payload.iat * 1000 > now + CLOCK_SKEW_MS) throw new Error('Token không hợp lệ.');
  return { uid: payload.sub, emailVerified: payload.email_verified === true };
}

// required=false (dev): bỏ qua xác thực. required=true (production): bắt buộc Bearer token hợp lệ + email đã xác minh.
export function createAuthGuard({ projectId, required, requireVerified = true, verify = verifyIdToken, getKeys } = {}) {
  return async function guard(req) {
    if (!required) return { ok: true, uid: null };
    if (!projectId) return { ok: false, status: 503, error: 'Backend chưa cấu hình FIREBASE_PROJECT_ID.' };
    const match = /^Bearer (.+)$/.exec(req.headers.authorization ?? '');
    if (!match) return { ok: false, status: 401, error: 'Cần đăng nhập để dùng chức năng này.' };
    try {
      const user = await verify(match[1], { projectId, ...(getKeys ? { getKeys } : {}) });
      if (requireVerified && !user.emailVerified) return { ok: false, status: 403, error: 'Hãy xác minh email trước.' };
      return { ok: true, uid: user.uid };
    } catch {
      return { ok: false, status: 401, error: 'Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.' };
    }
  };
}
