import { Buffer } from 'node:buffer';
import { createAuthGuard } from './auth.js';
import { getContestRepository } from './contestRepository.js';
import { AuthoringError, validateProblem } from '../src/utils/problemAuthoring.js';
import { TutorError } from './aiProvider.js';
import { analyzePdf, prepareProblemTests } from './pdfContestAI.js';
const invalid=(condition,message,status=400)=>{if(!condition)throw new TutorError(status,message);};
export function validatePdfImport(body){
  invalid(body&&typeof body.importId==='string'&&/^[a-f0-9-]{36}$/.test(body.importId),'Mã nhập đề không hợp lệ.');
  invalid(body.reviewed===true,'Hãy kiểm tra nội dung các bài trước khi lưu.');
  invalid(typeof body.publishProblems==='boolean','Trạng thái bài tập không hợp lệ.');
  invalid(Array.isArray(body.problems)&&body.problems.length>0&&body.problems.length<=26,'Chọn 1–26 bài để tạo contest.');
  const problems=body.problems.map((p,i)=>({...validateProblem({...p,slug:`pdf-${body.importId}-${i+1}`},{status:body.publishProblems?'published':'draft'}),points:p.points}));
  invalid(problems.every(p=>Number.isInteger(p.points)&&p.points>0&&p.points<=10000),'Điểm bài không hợp lệ.');
  return {importId:body.importId,problems,contest:body.contest};
}
export function createPdfContestHandler({repository,authenticate=createAuthGuard({projectId:process.env.FIREBASE_PROJECT_ID,required:true}),provider,execute,judgeConfig,env=process.env,timeoutMs=240000,clock=Date.now}={}){
  let active=0;
  return async(req,res)=>{
    const reply=(status,data)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}};
    const caller=await authenticate(req);if(!caller.ok)return reply(caller.status,{error:caller.error});
    const generating=/\/(generate-tests|prepare-tests)(?:\?|$)/.test(req.url);
    const timeoutMessage=generating?'Tạo test hết thời gian chờ. Hãy thử lại.':'AI hết thời gian xử lý. Hãy chọn ít trang hơn và thử lại.';
    let acquired=false;const controller=new AbortController();let timer;const close=()=>controller.abort();res.on('close',close);
    try{
      const repo=repository??getContestRepository();
      invalid((await repo.getProfile(caller.uid))?.role==='teacher','Chỉ giáo viên được tạo đề và test chấm.',403);
      const path=req.url.split('?')[0];
      const action=path==='/api/teacher/problems/generate-tests'?'prepare-tests':path.split('/').at(-1);
      invalid(req.method==='POST'&&['analyze','prepare-tests','import'].includes(action),'Không tìm thấy API nhập PDF.',404);
      invalid(active<2,'AI đang bận. Hãy thử lại sau.',429);active++;acquired=true;
      timer=setTimeout(()=>controller.abort(),timeoutMs);
      const chunks=[];let size=0;const limit=action==='analyze'?29*1024*1024:4*1024*1024;
      for await(const chunk of req){size+=chunk.length;invalid(size<=limit,'Dữ liệu quá lớn. Chọn PDF tối đa 20 MB hoặc giảm số bài mỗi lần nhập.',413);chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new TutorError(400,'Dữ liệu JSON không hợp lệ.');}
      controller.signal.throwIfAborted();
      const abort=new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new TutorError(504,timeoutMessage)),{once:true}));
      const options={body,provider,execute,judgeConfig,env,signal:controller.signal};
      const result=await Promise.race([action==='analyze'?analyzePdf(options):action==='prepare-tests'?prepareProblemTests(options):repo.importPdfContest(validatePdfImport(body),caller.uid,clock()),abort]);
      return reply(200,result);
    }catch(error){
      const known=error instanceof TutorError||error instanceof AuthoringError;
      const status=controller.signal.aborted?504:known?error.status:503;
      const message=controller.signal.aborted?timeoutMessage:known?error.message:generating?'Chưa tạo được bộ test. Kiểm tra cấu hình AI/máy chấm và thử lại.':'Không xử lý được đề PDF. Kiểm tra cấu hình AI/máy chấm và thử lại.';
      return reply(status,{error:message});
    }finally{clearTimeout(timer);res.removeListener('close',close);if(acquired)active--;}
  };
}
