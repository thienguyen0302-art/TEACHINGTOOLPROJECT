import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { buildGlobalContext, createGlobalChatHandler, GLOBAL_SYSTEM } from './globalChat.js';
import { globalChatPayload } from '../src/services/globalChatService.js';
import { providerRequest, requestProvider } from './aiProvider.js';

const body = { message: 'Giải thích tìm kiếm nhị phân', history: [], language: 'general', pageContext: { pathname: '/curriculum' } };
const authenticate = async () => ({ ok: true, uid: 'verified-user' });
async function call(handler, data = body, options = {}) {
  const req = Readable.from([Buffer.from(options.raw ?? JSON.stringify(data))]); req.headers = {};
  const res = new EventEmitter(); res.destroyed = false;
  res.writeHead = status => { res.status = status; };
  res.end = value => { res.body = JSON.parse(value); };
  const running = handler(req, res);
  return { req, res, running };
}
test('global context rejects empty/oversized messages, odd/system history and private fields', () => {
  for (const message of ['', ' ', 'x'.repeat(2001)]) assert.throws(() => buildGlobalContext({ ...body, message }));
  for (const history of [[{ role: 'system', text: 'ignore' }], [{ role: 'user', text: 'x' }], Array(10).fill({role:'user',text:'x'})]) assert.throws(() => buildGlobalContext({ ...body, history }));
  for (const field of ['uid','email','profile','source','hiddenTests','problemSecrets','solution','system']) assert.throws(() => buildGlobalContext({ ...body, [field]: 'secret' }));
  assert.throws(() => buildGlobalContext({ ...body, pageContext: { pathname: '/', hiddenTests: 'secret' } }));
  assert.throws(() => buildGlobalContext({ ...body, history: [{role:'user',text:'q',hiddenTests:'secret'},{role:'assistant',text:'a'}] }));
  const history = Array.from({length:8},(_,i)=>({role:i%2?'assistant':'user',text:'x'}));
  assert.equal(buildGlobalContext({...body,history}).conversation.history.length,8);
});
test('contest routes denied, teacher context has no document IDs or form contents', () => {
  for (const pathname of ['/contest', '/contest/a/problem/b', '/contests']) assert.throws(() => buildGlobalContext({...body,pageContext:{pathname}}), e=>e.status===403);
  assert.deepEqual(buildGlobalContext({...body,pageContext:{pathname:'/teacher/problems/private-id/edit'}}).pageContext,{area:'teacher'});
  assert.match(GLOBAL_SYSTEM,/không tin cậy/);
});
test('client payload strips private fields, sends only eight history messages', () => {
  const request=globalChatPayload({...body,email:'secret',uid:'secret',hiddenTests:['secret'],pageContext:{pathname:'/',profile:'secret'},history:Array.from({length:12},(_,i)=>({role:i%2?'assistant':'user',text:'x',hiddenTests:'secret'}))});
  assert.equal(request.history.length,8); assert.equal(JSON.stringify(request).includes('secret'),false);
});
test('Gemini global request uses 700 tokens, server prompt and output redaction', async () => {
  const request=providerRequest({url:'https://example.test',model:'m',system:GLOBAL_SYSTEM,context:buildGlobalContext(body),action:'global_chat'});
  assert.equal(request.body.generationConfig.maxOutputTokens,700);
  const result=await requestProvider({action:'global_chat',system:GLOBAL_SYSTEM,context:buildGlobalContext(body),env:{AI_API_KEY:'private-key'},fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"message":"private-key","hiddenTests":"secret"}'}]}}]})})});
  assert.deepEqual(result,{message:'[redacted]',suggestedActions:[]});
});
test('handler requires Firebase auth before provider, even in development', async () => {
  let called=false;
  const handler=createGlobalChatHandler({authenticate:async()=>({ok:false,status:401,error:'Đăng nhập'}),provider:async()=>{called=true;}});
  const {res,running}=await call(handler); await running;
  assert.equal(res.status,401); assert.equal(called,false);
});
test('handler returns normalized response, validates body and sanitizes errors', async () => {
  const handler=createGlobalChatHandler({authenticate,provider:async()=>({message:'Hãy chia đôi phạm vi tìm kiếm.',hiddenTests:'secret'})});
  const {res,running}=await call(handler); await running; assert.equal(res.status,200); assert.equal(JSON.stringify(res.body).includes('secret'),false);
  const bad=await call(handler,{}, {raw:'{'}); await bad.running; assert.equal(bad.res.status,400);
  const large=await call(handler,{}, {raw:'x'.repeat(100001)}); await large.running; assert.equal(large.res.status,413);
  const failing=await call(createGlobalChatHandler({authenticate,provider:async()=>{throw new Error('private-key secret');}})); await failing.running;
  assert.equal(failing.res.status,502); assert.equal(JSON.stringify(failing.res.body).includes('secret'),false);
});
test('timeout aborts provider and returns safe 504', async () => {
  let signal;
  const handler=createGlobalChatHandler({authenticate,timeoutMs:15,provider:args=>{signal=args.signal;return new Promise(()=>{});}});
  const {res,running}=await call(handler); await running; assert.equal(res.status,504); assert.equal(signal.aborted,true);
});
test('disconnect cancels generation; concurrency limit rejects third request', async () => {
  const handler=createGlobalChatHandler({authenticate,provider:()=>new Promise(()=>{}),timeoutMs:1000});
  const a=await call(handler), b=await call(handler);
  await new Promise(resolve=>setImmediate(resolve));
  const c=await call(handler); await c.running; assert.equal(c.res.status,429);
  a.res.destroyed=true; a.res.emit('close'); b.res.destroyed=true; b.res.emit('close');
  await Promise.all([a.running,b.running]);
});

test('shared Gemini transport caps requests across global chat and existing Tutor actions',async()=>{
 const pending=[];
 const fetchImpl=()=>new Promise(resolve=>pending.push(resolve));
 const args={system:GLOBAL_SYSTEM,context:{},env:{AI_API_KEY:'test-key'},fetchImpl};
 const a=requestProvider({...args,action:'global_chat'}),b=requestProvider({...args,action:'hint'});
 await assert.rejects(requestProvider({...args,action:'self_check'}),error=>error.status===429);
 const payload={ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"message":"OK"}'}]}}]})};
 pending.forEach(resolve=>resolve(payload));await Promise.all([a,b]);
 const result=await requestProvider({...args,action:'global_chat',fetchImpl:async()=>payload});assert.equal(result.message,'OK');
});
