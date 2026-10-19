import { spawn } from 'node:child_process';
import process, { loadEnvFile } from 'node:process';
import net from 'node:net';

try { loadEnvFile('.env.local'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const backendPort = Number(process.env.PORT || process.env.JUDGE_PORT || 3001);
const backendHost = process.env.HOST || '127.0.0.1';
// Fail before starting either watcher or Vite if another dev session owns the port.
try {
  await new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(backendPort, backendHost, () => probe.close(resolve));
  });
} catch (error) {
  console.error(error.code === 'EADDRINUSE'
    ? `[dev] Cổng backend ${backendPort} đang được sử dụng. Dừng phiên npm run dev / npm run judge:dev cũ bằng Ctrl+C rồi chạy lại. Chỉ mở một phiên npm run dev.`
    : `[dev] Không thể mở backend tại ${backendHost}:${backendPort}: ${error.message}`);
  process.exit(1);
}

const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
for (const args of [
  ['--watch', '--env-file-if-exists=.env.local', 'server/index.js'],
  ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)],
]) {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
