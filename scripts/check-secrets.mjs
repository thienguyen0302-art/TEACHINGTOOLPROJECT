// Chặn commit/build nếu trong code có khóa API thật (OpenAI, Google, Judge0/RapidAPI dạng hex dài...).
// Chạy: npm run check:secrets (cũng chạy tự động trước `npm run build`).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.firebase', 'imports']);
const SKIP_EXT = /\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|mp4|lock)$/i;
const PATTERNS = [
  ['OpenAI key', /sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['Private key', /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/],
  ['Gán khóa cứng vào biến', /(?:API_KEY|AUTH_TOKEN|SECRET)\s*=\s*["']?[A-Za-z0-9_-]{24,}["']?\s*$/m],
];

export function scanText(text) {
  return PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (st.size < 2_000_000 && !SKIP_EXT.test(name)) yield full;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const hits = [];
  for (const file of walk(ROOT)) {
    // .env / .env.local là nơi ĐƯỢC PHÉP chứa khóa (máy local) nên không quét nội dung,
    // nhưng bắt buộc phải nằm trong .gitignore (kiểm tra bên dưới). Chỉ .env.example được quét.
    if (/(^|[\\/])\.env(\..+)?$/.test(file) && !file.endsWith('.env.example')) continue;
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    const found = scanText(text);
    if (found.length) hits.push([relative(ROOT, file), found]);
  }
  const ignore = existsSync(join(ROOT, '.gitignore')) ? readFileSync(join(ROOT, '.gitignore'), 'utf8') : '';
  if (!/^\.env(\.local|\.\*)?\s*$/m.test(ignore)) {
    hits.push(['.gitignore', ['Thiếu dòng ".env.local" (hoặc ".env.*") nên file khóa có thể bị commit nhầm']]);
  }
  if (hits.length) {
    console.error('\n✖ Phát hiện thông tin bí mật trong mã nguồn (nội dung đã được ẩn):');
    for (const [file, kinds] of hits) console.error(`  - ${file}: ${kinds.join(', ')}`);
    console.error('\nHãy xóa khỏi file, đưa vào Secret Manager / .env.local, và thu hồi khóa nếu đã lộ.\n');
    process.exit(1);
  }
  console.log('✓ Không phát hiện khóa bí mật trong mã nguồn.');
}
