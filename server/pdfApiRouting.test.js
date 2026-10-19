import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

// Exercise the real server entry point, including dispatch before the generic
// contest handler. No Firebase token, Gemini request or database write is used.
test('real HTTP entry point dispatches all teacher PDF routes and rejects anonymous callers', async () => {
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT:'0', JUDGE_PORT:'0', HOST:'127.0.0.1', FIREBASE_PROJECT_ID:'routing-test' },
    stdio: ['ignore','pipe','pipe'],
  });
  let stderr=''; child.stderr.on('data',chunk=>{stderr+=chunk;});
  try {
    const port = await new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error(`Server did not start: ${stderr}`)),10000);
      child.once('exit', code=>{clearTimeout(timeout);reject(new Error(`Server exited (${code}): ${stderr}`));});
      child.stdout.on('data',chunk=>{const match=/Judge API: http:\/\/127\.0\.0\.1:(\d+)/.exec(String(chunk));if(match){clearTimeout(timeout);resolve(Number(match[1]));}});
    });
    const health=await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(health.status,200);const features=(await health.json()).features;assert.equal(features.pdfContestAI,true);assert.equal(features.automaticTests,true);
    for(const action of ['analyze','prepare-tests','import']){
      const response=await fetch(`http://127.0.0.1:${port}/api/teacher/pdf/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
      assert.equal(response.status,401,`${action} must reach PDF auth, not a 404`);
      assert.match((await response.json()).error,/đăng nhập/);
    }
    const generator=await fetch(`http://127.0.0.1:${port}/api/teacher/problems/generate-tests`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(generator.status,401);
  } finally {child.kill('SIGTERM');}
});

