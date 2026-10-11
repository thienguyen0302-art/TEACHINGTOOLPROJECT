import { spawn } from 'node:child_process';
import process from 'node:process';

const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
for (const args of [
  ['--env-file-if-exists=.env.local', 'server/index.js'],
  ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)],
]) {
  const child = spawn(process.execPath, args, { stdio: 'inherit' });
  children.push(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
