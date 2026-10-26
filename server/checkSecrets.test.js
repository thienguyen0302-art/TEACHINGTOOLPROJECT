import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from '../scripts/check-secrets.mjs';

test('check-secrets bắt khóa thật, bỏ qua chuỗi giả trong test', () => {
  assert.deepEqual(scanText('KEY="sk-proj-' + 'a'.repeat(60) + '"'), ['OpenAI key']);
  assert.deepEqual(scanText('OPENAI_API_KEY=${KEY}'), []);
  assert.deepEqual(scanText("env: { OPENAI_API_KEY: 'private-openai-key' }"), []);
  assert.deepEqual(scanText('--update-secrets "OPENAI_API_KEY=openai-key:latest"'), []);
});
