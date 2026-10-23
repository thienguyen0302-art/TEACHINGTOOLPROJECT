import test from 'node:test';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { analyzePdf, normalizePdfAnalysis, prepareProblemTests, PDF_IMPORT_SCHEMA } from './pdfContestAI.js';
import { createPdfContestHandler, validatePdfImport } from './pdfContest.js';
import { providerRequest, requestProvider } from './aiProvider.js';
import { seedContest, authoredProblem } from './contestTestSupport.js';
const rawProblem=()=>({title:'Tổng hai số',statement:'Cho hai số a, b. Tính a+b.',inputDescription:'Hai số nguyên a,b.',outputDescription:'Tổng của a,b.',constraints:['0 ≤ a,b ≤ 100'],samples:[{input:'2 3',output:'5',explanation:''}],difficulty:'basic',tags:['math'],points:100,sourcePages:[1],warnings:[]});
const auditFor = raw => ({reviews:raw.problems.map((_,problemIndex)=>({problemIndex,requiresTeacherReview:false,warnings:[]}))});
const analysisProvider = async ({context}) => context.task==='audit'?auditFor(rawAnalysis()):rawAnalysis();
const rawAnalysis=()=>({title:'Synthetic round',description:'A generated fixture only.',durationMinutes:150,warnings:[],problems:[rawProblem()]});
async function fixturePdf(){const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);doc.addPage().drawText('UNSELECTED PRIVATE SOLUTION',{font});doc.addPage().drawText('Problem A: Compute a+b',{font});return Buffer.from(await doc.save()).toString('base64');}
const plan=()=>({canJudge:true,warnings:[],referencePython:'a,b=map(int,input().split());print(a+b)',independentPython:'import sys\nprint(sum(map(int,sys.stdin.read().split())))',testInputs:['0 0','1 100','100 100']});
const execute=async({input})=>({statusId:3,stdout:String(input.trim().split(/\s+/).map(Number).reduce((s,n)=>s+n,0))});
const config=()=>({languageId:28});
async function call(handler,action,body){const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.url=`/api/teacher/pdf/${action}`;req.method='POST';req.headers={};const res=new EventEmitter();let status,reply;res.writeHead=s=>{status=s;};res.end=text=>{reply=JSON.parse(text);};await handler(req,res);return {status,data:reply};}
test('multimodal Gemini request sends actual PDF plus strict schema and large output budget',()=>{
 const request=providerRequest({url:'https://example.test',model:'m',system:'system',context:{pages:[2]},document:'JVBERi0=',responseSchema:PDF_IMPORT_SCHEMA,action:'pdf_contest'});
 assert.deepEqual(request.body.contents[0].parts[0],{inline_data:{mime_type:'application/pdf',data:'JVBERi0='}});assert.equal(request.body.generationConfig.responseSchema,PDF_IMPORT_SCHEMA);assert.ok(request.body.generationConfig.maxOutputTokens>20000);assert.equal(request.body.generationConfig.thinkingConfig.thinkingLevel,'medium');
});
test('structured provider output is preserved, secrets are redacted and truncation is rejected',async()=>{
 const env={AI_PROVIDER:'gemini',AI_API_KEY:'SECRET_KEY',AI_MODEL:'m'};
 const args={action:'pdf_contest',system:'s',context:{},env};
 const response=await requestProvider({...args,fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({...rawAnalysis(),description:'SECRET_KEY'})}]}}]})})});
 assert.equal(response.problems.length,1);assert.equal(response.description,'[redacted]');
 await assert.rejects(requestProvider({...args,fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS'}]})})}),/token/);
});
test('analysis physically slices selected pages, maps original page numbers and strips model secrets',async()=>{
 let captured,calls=0;
 const result=await analyzePdf({body:{pdfBase64:await fixturePdf(),pages:'2'},provider:async request=>{captured=request;calls++;if(request.context.task==='audit')return auditFor(rawAnalysis());return {...rawAnalysis(),problems:[{...rawProblem(),hiddenTests:[{input:'LEAK',output:'LEAK'}],solution:'SECRET_SOLUTION'}]};}});
 assert.equal(calls,2,'analysis must include a source-audit pass');
 const sent=await PDFDocument.load(Buffer.from(captured.document,'base64'));assert.equal(sent.getPageCount(),1);assert.deepEqual(captured.context.originalPages,[2]);assert.deepEqual(result.problems[0].sourcePages,[2]);assert.deepEqual(result.problems[0].hiddenTests,[]);assert.ok(!JSON.stringify(result).includes('LEAK'));assert.ok(!JSON.stringify(result).includes('SECRET_SOLUTION'));
});
test('source-audit flags are preserved and block preparation until teacher edits the problem',async()=>{
 const result=await analyzePdf({body:{pdfBase64:await fixturePdf(),pages:'2'},provider:async({context})=>context.task==='audit'?{reviews:[{problemIndex:0,requiresTeacherReview:true,warnings:['Ví dụ không khớp bước di chuyển.']}]}:rawAnalysis()});
 assert.match(result.problems[0].statement,/CẦN KIỂM TRA/);assert.match(result.problems[0].warnings.join(' '),/không khớp/);
 await assert.rejects(prepareProblemTests({body:{problem:result.problems[0]}}),/CẦN KIỂM TRA/);
});
test('invalid PDF, invalid pages and invalid model source/count are rejected',async()=>{
 await assert.rejects(analyzePdf({body:{pdfBase64:Buffer.from('not pdf').toString('base64'),pages:'1'}}));
 await assert.rejects(analyzePdf({body:{pdfBase64:await fixturePdf(),pages:'3'}}),/trang/);
 assert.throws(()=>normalizePdfAnalysis({...rawAnalysis(),problems:[]},[1]));
 assert.throws(()=>normalizePdfAnalysis({...rawAnalysis(),problems:[{...rawProblem(),sourcePages:[4]}]},[1]));
});
test('test outputs are computed by Judge from two references; sample mismatch and disagreement fail closed',async()=>{
 const body={problem:authoredProblem({samples:[{input:'2 3',output:'5'}]})};
 const result=await prepareProblemTests({body,provider:async()=>plan(),execute,judgeConfig:config});
 assert.deepEqual(result.hiddenTests.map(t=>t.output),['0','101','200']);assert.equal(result.verification.referenceImplementations,2);assert.equal(result.verification.samplesChecked,1);assert.ok(!JSON.stringify(result).includes('referencePython'));
 await assert.rejects(prepareProblemTests({body,provider:async()=>plan(),execute:async()=>({statusId:3,stdout:'wrong'}),judgeConfig:config}),/ví dụ gốc/);
 await assert.rejects(prepareProblemTests({body,provider:async()=>plan(),execute:async args=>args.input==='2 3'?execute(args):({statusId:3,stdout:args.source===plan().referencePython?'0':'1'}),judgeConfig:config}),/khác nhau/);
});
test('test preparation requires source samples, rejects unjudgeable tasks and does not invent test outputs',async()=>{
 await assert.rejects(prepareProblemTests({body:{problem:authoredProblem({samples:[]})}}),/ví dụ/);
 await assert.rejects(prepareProblemTests({body:{problem:authoredProblem({statement:'[CẦN KIỂM TRA] Quy tắc và ví dụ mâu thuẫn.'})}}),/CẦN KIỂM TRA/);
 await assert.rejects(prepareProblemTests({body:{problem:authoredProblem()},provider:async()=>({canJudge:false,warnings:['Đề có nhiều nghiệm.']}),judgeConfig:config}),/nhiều nghiệm/);
 await assert.rejects(prepareProblemTests({body:{problem:authoredProblem()},provider:async()=>plan(),execute:async()=>({statusId:6,stdout:''}),judgeConfig:config}),/chưa chạy thành công/);
});
const importBody=()=>({importId:'12345678-1234-4234-8234-123456789abc',reviewed:true,publishProblems:true,contest:{title:'AI reviewed round',description:'',startAt:2000000,durationMinutes:150},problems:Array.from({length:4},(_,i)=>({...authoredProblem(),title:`Problem ${i}`,points:100}))});
test('atomic contest import is idempotent, keeps tests private and preserves later teacher edits',async()=>{
 const store=seedContest();const input=validatePdfImport(importBody());
 const result=await store.repository.importPdfContest(input,'t1',1000000);
 assert.equal(result.problemIds.length,4);assert.equal(store.records.get(`contests/${result.id}`).status,'draft');
 for(const id of result.problemIds){assert.equal(store.records.get(`problems/${id}`).hiddenTests,undefined);assert.equal(store.records.get(`problems/${id}`).status,'published');assert.equal(store.records.get(`problemSecrets/${id}`).hiddenTests.length,1);}
 store.put(`problems/${result.problemIds[0]}`,{...store.records.get(`problems/${result.problemIds[0]}`),title:'Teacher edit'});
 const count=store.records.size;await store.repository.importPdfContest(input,'t1',1000001);assert.equal(store.records.size,count);assert.equal(store.records.get(`problems/${result.problemIds[0]}`).title,'Teacher edit');
 await assert.rejects(store.repository.importPdfContest({...input,contest:{...input.contest,title:'Changed'}},'t1',1000001),/nội dung khác/);
});
test('draft import allows missing tests and requires review; published problem import validates tests',()=>{
 const draft={...importBody(),publishProblems:false,problems:[{...authoredProblem(),samples:[],hiddenTests:[],points:100}]};
 assert.equal(validatePdfImport(draft).problems[0].status,'draft');assert.throws(()=>validatePdfImport({...draft,reviewed:false}));assert.throws(()=>validatePdfImport({...draft,publishProblems:true}));
});
test('teacher PDF routes reject unauthenticated/student callers before reading PDF or calling AI',async()=>{
 let calls=0;const store=seedContest();const provider=async()=>{calls++;return rawAnalysis();};
 for(const [authenticate,status]of [[async()=>({ok:false,status:401,error:'Login'}),401],[async()=>({ok:true,uid:'u1'}),403]]){
  const response=await call(createPdfContestHandler({repository:store.repository,authenticate,provider}),'analyze',{});assert.equal(response.status,status);
 }assert.equal(calls,0);
});
test('teacher analysis route returns structured drafts and timeout clears the active slot',async()=>{
 const store=seedContest();let slow=true;
 const handler=createPdfContestHandler({repository:store.repository,authenticate:async()=>({ok:true,uid:'t1'}),provider:args=>slow?new Promise(()=>{}):analysisProvider(args),timeoutMs:25});
 const body={pdfBase64:await fixturePdf(),pages:'2'};assert.equal((await call(handler,'analyze',body)).status,504);
 slow=false;assert.equal((await call(handler,'analyze',body)).status,200);
});

test('manual editor test-generation route uses teacher auth and performs no database writes',async()=>{
 const store=seedContest();const before=store.records.size;
 const body={problem:authoredProblem({samples:[{input:'2 3',output:'5'}]}),maxTests:3};
 const handler=createPdfContestHandler({repository:store.repository,authenticate:async()=>({ok:true,uid:'t1'}),provider:async({context})=>{assert.equal(context.maxTests,3);return plan();},execute,judgeConfig:config});
 const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.url='/api/teacher/problems/generate-tests';req.method='POST';req.headers={};
 const res=new EventEmitter();let status,data;res.writeHead=s=>{status=s;};res.end=raw=>{data=JSON.parse(raw);};await handler(req,res);
 assert.equal(status,200);assert.equal(data.hiddenTests.length,3);assert.equal(store.records.size,before);
});
test('generation respects remaining test capacity, rejects blank examples, and checks judge config before AI',async()=>{
 const problem=authoredProblem({samples:[{input:'2 3',output:'5'}]});
 const result=await prepareProblemTests({body:{problem,maxTests:1},provider:async()=>({...plan(),testInputs:['0 0']}),execute,judgeConfig:config});assert.equal(result.hiddenTests.length,1);
 await assert.rejects(prepareProblemTests({body:{problem:authoredProblem({samples:[{input:'',output:''}]})}}),/ví dụ/);
 await assert.rejects(prepareProblemTests({body:{problem,maxTests:9}}),/1–8/);
 let called=false;await assert.rejects(prepareProblemTests({body:{problem},provider:async()=>{called=true;return plan();},judgeConfig:()=>{throw new Error('Judge config missing');}}),/Judge config missing/);assert.equal(called,false);
});
