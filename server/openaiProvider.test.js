import test from 'node:test';
import assert from 'node:assert/strict';
import { openaiRequest, requestProvider } from './aiProvider.js';
import { PDF_IMPORT_SCHEMA, PDF_AUDIT_SCHEMA, PDF_TEST_SCHEMA } from './pdfContestAI.js';

const env = { OPENAI_API_KEY: 'private-openai-key', AI_API_KEY: 'old-gemini-key' };
const reply = (value) => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }] }) });

test('default OpenAI sends bearer auth, bounded JSON and no stored responses', async () => {
  const result = await requestProvider({ env, action: 'hint', system: 'Tutor policy', context: { source: 'x=1' }, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer private-openai-key');
    assert.equal(options.headers['x-goog-api-key'], undefined);
    const body = JSON.parse(options.body);
    assert.equal(body.model, 'gpt-5.4-mini');
    assert.equal(body.max_completion_tokens, 350);
    assert.equal(body.reasoning_effort, 'none');
    assert.equal(body.store, false);
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.match(body.messages[0].content, /Tutor policy/);
    assert.deepEqual(JSON.parse(body.messages[1].content[0].text), { source: 'x=1' });
    assert.equal(options.body.includes(env.OPENAI_API_KEY), false);
    return reply({ message: 'private-openai-key old-gemini-key', confidence: 'high' });
  } });
  assert.equal(result.message, '[redacted] [redacted]');
});

test('OpenAI PDF embeds actual bytes and converts every nested schema to strict JSON Schema', () => {
  for (const responseSchema of [PDF_IMPORT_SCHEMA, PDF_AUDIT_SCHEMA, PDF_TEST_SCHEMA]) {
    const request = openaiRequest({ url: 'https://api.openai.com/v1/', model: 'gpt-5.4-mini', action: 'pdf_contest', system: 's', context: {}, document: 'JVBERi0=', responseSchema });
    assert.equal(request.url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(request.body.messages[1].content[0].file.file_data, 'data:application/pdf;base64,JVBERi0=');
    assert.equal(request.body.reasoning_effort, 'low');
    assert.equal(request.body.max_completion_tokens, 24576);
    assert.equal(request.body.response_format.json_schema.strict, true);
    function check(schema) {
      assert.equal(schema.type, schema.type.toLowerCase());
      if (schema.properties) {
        assert.equal(schema.additionalProperties, false);
        assert.deepEqual(schema.required, Object.keys(schema.properties));
        Object.values(schema.properties).forEach(check);
      }
      if (schema.items) check(schema.items);
    }
    check(request.body.response_format.json_schema.schema);
    assert.equal(responseSchema.type, 'OBJECT');
  }
});

test('PDF model override, output normalization and token budgets survive migration', async () => {
  for (const [action, value] of [
    ['pdf_contest', { problems: [{ title: 'Test' }] }],
    ['pdf_test_plan', { canJudge: true, testInputs: ['1'] }],
    ['global_chat', { message: 'Hello' }],
    ['self_check', { accuracy: 90, summary: 'Good' }],
  ]) {
    const result = await requestProvider({ env: { ...env, AI_MODEL: 'gpt-5.4-mini', AI_PDF_MODEL: 'pdf-model' }, action, context: {}, fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      assert.equal(body.model, action.startsWith('pdf_') ? 'pdf-model' : 'gpt-5.4-mini');
      return reply(value);
    } });
    if (action.startsWith('pdf_')) assert.deepEqual(result, value);
    else if (action === 'global_chat') assert.equal(result.message, value.message);
    else assert.equal(result.accuracy, value.accuracy);
  }
});

test('OpenAI refuses old Gemini credentials and rejects unsafe or incomplete provider responses', async () => {
  await assert.rejects(requestProvider({ env: { AI_API_KEY: 'old-gemini-key' }, action: 'hint' }), /OPENAI_API_KEY/);
  for (const choice of [
    { finish_reason: 'length' },
    { finish_reason: 'content_filter' },
    { finish_reason: 'stop', message: { refusal: 'private-provider-text' } },
    { finish_reason: 'tool_calls' },
    { finish_reason: 'stop', message: { content: '' } },
  ]) {
    await assert.rejects(requestProvider({ env, action: 'hint', context: {}, fetchImpl: async () => ({ ok: true, json: async () => ({ choices: [choice] }) }) }), e => e.status === 502 && !e.message.includes('private-provider-text'));
  }
  for (const status of [400, 401, 403, 404, 429, 500]) {
    await assert.rejects(requestProvider({ env, action: 'hint', context: {}, fetchImpl: async () => ({ ok: false, status, json: async () => ({ error: { message: env.OPENAI_API_KEY } }) }) }), e => e.status === 502 && !e.message.includes(env.OPENAI_API_KEY));
  }
});
