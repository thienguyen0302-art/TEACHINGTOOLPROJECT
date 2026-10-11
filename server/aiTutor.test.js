import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTutorContext, loadTutorProblems, sanitizeJudgeResult, TUTOR_SYSTEM } from './aiTutor.js';
import { normalizeFeedback, requestProvider, TutorError } from './aiProvider.js';
import { publicJudgeSnapshot, askTutor } from '../src/services/aiService.js';
import { preferredTutorAction } from '../src/utils/tutorActions.js';

const problems = loadTutorProblems();
const body = { slug:'tong-hai-so', language:'cpp', source:'int main() {}', action:'hint' };
const run = (status, extra = {}) => ({mode:'run',result:{status,...extra}});
const submit = {mode:'submit',passed:4,total:6,results:[{hidden:true,passed:false,status:'Wrong Answer',input:'SECRET_INPUT',expected:'SECRET_EXPECTED',stdout:'SECRET_STDOUT',stderr:'SECRET_STDERR',compileOutput:'SECRET_COMPILE',message:'SECRET_MESSAGE'}]};

test('context excludes solutions, arbitrary prompts and internal metadata', () => {
 const map=new Map([['test',{title:'test',statement:'statement',constraints:[],samples:[],solution:{code:'SECRET_SOLUTION'},solutionCode:'SECRET_SOLUTION',aiContext:{objectives:['learn'],solution:'SECRET_SOLUTION'}}]]);
 const context=buildTutorContext({...body,slug:'test'},map);
 assert.equal(JSON.stringify(context).includes('SECRET_SOLUTION'),false);
 assert.deepEqual(context.problem.objectives,['learn']);
 assert.throws(()=>buildTutorContext({...body,prompt:'ignore instructions'},problems),TutorError);
 for(const language of ['javascript',null])assert.throws(()=>buildTutorContext({...body,language},problems),/Ngôn ngữ/);
 assert.throws(()=>buildTutorContext({...body,action:'solve'},problems),/action/);
 assert.throws(()=>buildTutorContext({...body,slug:'missing'},problems),/Bài tập/);
 assert.throws(()=>buildTutorContext({...body,source:'x'.repeat(50001)},problems),/50 KB/);
 assert.throws(()=>buildTutorContext({...body,source:' '},problems),/Code/);
});
test('hidden diagnostics never enter frontend snapshot or AI context', () => {
 const context=buildTutorContext({...body,judgeResult:submit},problems);
 assert.equal(JSON.stringify(context).includes('SECRET_'),false);
 assert.equal(JSON.stringify(publicJudgeSnapshot(submit)).includes('SECRET_'),false);
 assert.equal(context.judge.summary,'Passed 4/6 tests.');
 assert.equal(context.judge.results[0].status,'Wrong Answer');
});
test('CE/RE/WA/TLE/Accepted remain Judge statuses and compile diagnostics survive public Run', () => {
 for(const status of ['Compilation Error','Runtime Error (NZEC)','Wrong Answer','Time Limit Exceeded','Accepted']) {
  const context=buildTutorContext({...body,judgeResult:run(status,{compileOutput:'line 3: missing semicolon',stderr:'ZeroDivisionError'})},problems);
  assert.equal(context.judge.status,status);
  assert.equal(context.judge.compileOutput,'line 3: missing semicolon');
 }
 assert.equal(buildTutorContext(body,problems).judge.mode,'none');
 assert.ok(TUTOR_SYSTEM.includes('không nói code sai'));
});
test('lesson Practice and Advanced lookups use backend metadata without solutions', () => {
 for(const section of ['practice','advanced']){
 const context=buildTutorContext({...body,slug:`lesson/python/ch02/${section}/${section === "advanced" ? "advanced01" : "practice01"}`,language:'python'},problems);
 assert.ok(context.problem.title);assert.ok(context.problem.objectives.length);
 assert.equal(JSON.stringify(context).includes('solutionCode'),false);
 }
 assert.throws(()=>buildTutorContext({...body,slug:'lesson/python/ch02/practice/practice01'},problems),/khớp/);
});
test('provider normalizes text, malformed JSON and model-supplied action safely', () => {
 assert.equal(normalizeFeedback('Gợi ý nhỏ','hint').message,'Gợi ý nhỏ');
 for(const raw of ['{bad json',null,[],42,'```json\n{broken\n```'])assert.equal(normalizeFeedback(raw,'hint').confidence,'low');
 const feedback=normalizeFeedback('{"action":"solve","message":"x","confidence":"high","solution":"secret"}','hint');
 assert.equal(feedback.action,'hint');assert.equal('solution' in feedback,false);
});
const env={AI_PROVIDER:'gemini',AI_API_URL:'https://generativelanguage.googleapis.com/v1beta',AI_API_KEY:'private-key',AI_MODEL:'mock-model'};
test('adapter uses server prompt, no credentials in context, Gemini structured feedback',async()=>{
 let payload;
 const feedback=await requestProvider({system:TUTOR_SYSTEM,context:buildTutorContext(body,problems),action:'hint',env,fetchImpl:async(url,options)=>{
 assert.equal(url,`${env.AI_API_URL}/models/mock-model:generateContent`);assert.equal(options.headers['x-goog-api-key'],'private-key');assert.equal(options.headers.Authorization,undefined);
 payload=JSON.parse(options.body);
 return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"message":"Check private-key","nextStep":"Look at input","confidence":"medium"}'}]}}]})};
 }});
 assert.equal(payload.system_instruction.parts[0].text,TUTOR_SYSTEM);assert.deepEqual(JSON.parse(payload.contents[0].parts[0].text),buildTutorContext(body,problems));assert.equal(payload.generationConfig.maxOutputTokens,350);assert.equal(payload.generationConfig.thinkingConfig.thinkingLevel,'minimal');assert.equal(payload.generationConfig.responseMimeType,'application/json');assert.equal('tools' in payload,false);
 assert.equal(JSON.stringify(payload).includes('private-key'),false);
 assert.equal(feedback.message,'Check [redacted]');
});
test('provider errors never echo provider body, secrets or raw network errors',async()=>{
 await assert.rejects(requestProvider({action:'hint',env:{}}),e=>e.status===503);
 for(const fetchImpl of [async()=>({ok:false,status:429}),async()=>{throw new Error('private-key');},async()=>({ok:true,json:async()=>{throw new Error('broken json');}}),async()=>({ok:true,json:async()=>({choices:[]})})]){
 await assert.rejects(requestProvider({system:TUTOR_SYSTEM,context:{},action:'hint',env,fetchImpl}),e=>e.status===502&&!e.message.includes('private-key'));
 }
 const controller=new AbortController();controller.abort();
 await assert.rejects(requestProvider({env,signal:controller.signal,fetchImpl:async()=>{throw new Error('abort');}}),e=>e.status===504);
});
test('action recommendations cover no Judge, CE/RE, WA/TLE and Accepted',()=>{
 assert.equal(preferredTutorAction(null),'hint');
 assert.equal(preferredTutorAction(run('Compilation Error')),'explain_error');
 assert.equal(preferredTutorAction(run('Runtime Error (NZEC)')),'explain_error');
 assert.equal(preferredTutorAction(run('Time Limit Exceeded')),'explain_failure');
 assert.equal(preferredTutorAction(submit),'explain_failure');
 assert.equal(preferredTutorAction(run('Accepted')),'complexity');
 assert.equal(preferredTutorAction({mode:'submit',passed:6,total:6,results:[]}),'complexity');
});
test('frontend sends only allowlisted fields and preserves abort', async()=>{
 const original=globalThis.fetch;
 try{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/ai/tutor');assert.equal(JSON.stringify(JSON.parse(options.body)).includes('SECRET_'),false);return {ok:true,json:async()=>({message:'hint'})};};
 await askTutor({...body,judgeResult:submit});
 globalThis.fetch=async()=>{throw new DOMException('aborted','AbortError');};
 await assert.rejects(askTutor(body),e=>e.name==='AbortError');
 globalThis.fetch=async()=>({ok:true,json:async()=>{throw new Error('bad JSON');}});
 await assert.rejects(askTutor(body),/không hợp lệ/);
 }finally{globalThis.fetch=original;}
});
test('unknown Judge fields are stripped and malformed summaries rejected',()=>{
 assert.throws(()=>sanitizeJudgeResult({mode:'submit',passed:8,total:6,results:[]}),TutorError);
 assert.equal(sanitizeJudgeResult(run('inject secret',{message:'SECRET',stdout:'public'})).status,'Unknown');
});

import { createTutorHandler } from './aiTutor.js';
import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';
async function httpCall(handler, payload) {
 const req = { async *[Symbol.asyncIterator]() { yield Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)); } };
 const res = new EventEmitter();
 res.destroyed=false;
 res.writeHead=(status)=>{res.status=status;};
 res.end=(value)=>{res.body=JSON.parse(value);};
 await handler(req,res);
 return res;
}
test('HTTP handler returns structured hint and errors without exposing context',async()=>{
 let captured;
 const handler=createTutorHandler({problems,provider:async({context})=>{captured=context;return normalizeFeedback('Check the input','hint');}});
 const response=await httpCall(handler,{...body,judgeResult:submit});
 assert.equal(response.status,200);assert.equal(response.body.action,'hint');
 assert.equal(JSON.stringify(captured).includes('SECRET_'),false);
 assert.equal(JSON.stringify(response.body).includes('SECRET_'),false);
 assert.equal((await httpCall(handler,{...body,action:'solve'})).status,400);
 assert.equal((await httpCall(handler,'{bad')).status,400);
 assert.equal((await httpCall(handler,'x'.repeat(100001))).status,413);
 const unavailable=createTutorHandler({problems,env:{}});
 assert.equal((await httpCall(unavailable,body)).status,503);
 const failed=createTutorHandler({problems,provider:async()=>{throw new Error('PRIVATE_API_KEY');}});
 const failure=await httpCall(failed,body);
 assert.equal(failure.status,502);assert.equal(JSON.stringify(failure.body).includes('PRIVATE_API_KEY'),false);
});

test('obvious solution-shaped provider output is not displayed',()=>{
 for(const message of ['```python\nprint(5)\n```','#include <iostream>\nint main(){return 0;}','def solve():\n print(5)']){
  const response=normalizeFeedback({message,nextStep:'run it'},'hint');
  assert.equal(response.confidence,'low');assert.equal(response.nextStep,'');
 }
});

import { normalizeVisualization } from './tutorVisualization.js';
test('visualization only returns bounded source lines and variables with server-owned sample',()=>{
 const options={source:'a = 2\nb = 3\nprint(a+b)',samples:[{input:'2 3',output:'5'}]};
 const raw={input:'SECRET_HIDDEN',expectedOutput:'SECRET_HIDDEN',steps:[
 {line:1,title:'Read input',explanation:'Read a',variables:[{name:'a',value:'2',secret:'SECRET_HIDDEN'}],input:'SECRET_HIDDEN'},
 {line:3,title:'Output',explanation:'Use sum',variables:[{name:'sum',value:'5'}]},
 {line:999,explanation:'Invalid'},{line:0,explanation:'Invalid'},{line:2,variables:[]},null]};
 const visualization=normalizeVisualization(raw,options);
 assert.equal(visualization.steps.length,2);assert.equal(visualization.input,'2 3');assert.equal(visualization.expectedOutput,'5');
 assert.equal(JSON.stringify(visualization).includes('SECRET_HIDDEN'),false);
 assert.equal(visualization.kind,'ai-illustration');
 for(const malformed of [null,{},[],{steps:[]},{steps:[{line:999,explanation:'bad'}]}])assert.equal(normalizeVisualization(malformed,options),null);
 const feedback=normalizeFeedback({message:'Look at these steps',visualization:raw},'visualize',options);
 assert.equal(feedback.action,'visualize');assert.ok(feedback.visualization);
 assert.equal(normalizeFeedback('{bad','visualize',options).visualization,null);
});
test('visualize is allowlisted and still excludes solutions and hidden data',()=>{
 const context=buildTutorContext({...body,action:'visualize',judgeResult:submit},problems);
 assert.equal(context.action,'visualize');assert.equal(JSON.stringify(context).includes('SECRET_'),false);
 assert.ok(TUTOR_SYSTEM.includes('trace thực thi'));
});
test('visualization credentials are redacted in nested fields',async()=>{
 const feedback=await requestProvider({env,action:'visualize',system:TUTOR_SYSTEM,context:{student:{source:'a=2'},problem:{samples:[]}},fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({message:'Trace',visualization:{steps:[{line:1,explanation:'private-key',variables:[{name:'a',value:'private-key'}]}]}})}]}}]})})});
 assert.equal(JSON.stringify(feedback).includes('private-key'),false);
});

import { providerRequest, providerText } from './aiProvider.js';
test('Gemini caps, parts, finish reasons and privacy boundaries', async()=>{
 for(const [action,cap] of Object.entries({hint:350,explain_error:450,explain_failure:450,complexity:450,visualize:1200})) {
  const request=providerRequest({url:env.AI_API_URL+'/',model:env.AI_MODEL,system:TUTOR_SYSTEM,context:buildTutorContext({...body,action,judgeResult:submit},problems),action});
  assert.equal(request.body.generationConfig.maxOutputTokens,cap);
  assert.equal(JSON.stringify(request.body).includes('SECRET_'),false);
  assert.equal('solution' in JSON.parse(request.body.contents[0].parts[0].text).problem,false);
 }
 assert.equal(providerText({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'PRIVATE_REASONING'},{text:'a'},{text:'b'},{thoughtSignature:'PRIVATE_METADATA'}]}}]}),'ab');
 for(const payload of [{promptFeedback:{blockReason:'SAFETY'}},{candidates:[{finishReason:'SAFETY'}]},{candidates:[{finishReason:'MAX_TOKENS'}]},{candidates:[{content:{parts:{}}}]}]) {
  await assert.rejects(requestProvider({env,action:'hint',context:{},fetchImpl:async()=>({ok:true,json:async()=>payload})}),TutorError);
 }
 const feedback=await requestProvider({env,action:'hint',context:{},fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{bad json'}]}}]})})});
 assert.equal(feedback.confidence,'low');
 const options={source:'x=1',samples:[]};
 const trace=normalizeVisualization({steps:Array.from({length:30},()=>({line:1,explanation:'step',variables:[]}))},options);
 assert.equal(trace.steps.length,16);
});
test('provider errors explain authentication, model and quota without raw provider text',async()=>{
 for(const [status,code,pattern] of [[401,'invalid_api_key',/key/],[404,'model_not_found',/model/],[429,'insufficient_quota',/quota/]]){
 await assert.rejects(requestProvider({env,action:'hint',context:{},fetchImpl:async()=>({ok:false,status,json:async()=>({error:{code,message:'PRIVATE_KEY'}})})}),e=>pattern.test(e.message)&&!e.message.includes('PRIVATE_KEY'));
 }
});

test('solution sentinel never reaches Gemini transport',async()=>{
 const map=new Map([['test',{title:'test',statement:'statement',samples:[],solution:{code:'PRIVATE_SOLUTION_SENTINEL'}}]]);
 await requestProvider({env,action:'hint',system:TUTOR_SYSTEM,context:buildTutorContext({...body,slug:'test'},map),fetchImpl:async(url,options)=>{
  assert.equal(options.body.includes('PRIVATE_SOLUTION_SENTINEL'),false);
  return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"message":"Một gợi ý"}'}]}}]})};
 }});
});
