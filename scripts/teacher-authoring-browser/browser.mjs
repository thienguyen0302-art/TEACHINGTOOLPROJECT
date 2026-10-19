import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { PDFDocument,StandardFonts } from 'pdf-lib';
import { problemTemplate } from '../../src/utils/problemAuthoring.js';
const doc=await PDFDocument.create();const font=await doc.embedFont(StandardFonts.Helvetica);doc.addPage().drawText('Synthetic contest: four independent tasks.',{font});
await mkdir('imports/teacher-authoring-test',{recursive:true});await writeFile('imports/teacher-authoring-test/four-problems.pdf',await doc.save());
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const saved=new Map();let contest=null,analyzed=0,prepared=0,imports=0,lastImport;let failAnalysis=true,failImport=true;
  const aiProblems=Array.from({length:4},(_,i)=>({...structuredClone(problemTemplate),slug:`pdf-draft-${i+1}`,title:`Bài ${i+1} · Tổng hai số`,statement:'Cho hai số a,b. Hãy tính tổng a+b.',inputDescription:'Hai số nguyên.',outputDescription:'In tổng.',constraints:['0 ≤ a,b ≤ 100'],samples:[{input:'2 3',output:'5',explanation:''}],hiddenTests:[],points:100,sourcePages:[1],warnings:[],status:'draft'}));
  await page.route('**/api/teacher/**',async route=>{
   const req=route.request(),parts=new URL(req.url()).pathname.split('/'),id=parts[4];
   if(parts[3]==='pdf'){
    const body=req.postDataJSON();
    if(id==='analyze'){
     analyzed++;assert.equal(Buffer.from(body.pdfBase64,'base64').subarray(0,5).toString(),'%PDF-');assert.equal(body.pages,'1');
     if(failAnalysis){failAnalysis=false;return route.fulfill({status:404,json:{error:'Không tìm thấy API.'}});}
     return route.fulfill({json:{title:'Contest AI từ PDF',description:'4 bài từ tài liệu.',durationMinutes:150,warnings:[],problems:aiProblems}});
    }
    if(id==='prepare-tests'){prepared++;assert.equal(body.problem.samples[0].output,'5');return route.fulfill({json:{hiddenTests:[{input:'9 8',output:'17'},{input:'0 0',output:'0'},{input:'100 100',output:'200'}],warnings:[],verification:{referenceImplementations:2,samplesChecked:1,testsChecked:3}}});}
    if(id==='import'){
     imports++;
     if(lastImport)assert.deepEqual(body,lastImport,'retry must keep the same import key and payload');lastImport=body;
     assert.equal(body.problems.length,4);assert.equal(body.reviewed,true);assert.equal(body.publishProblems,true);
     if(!contest){
      body.problems.forEach((p,i)=>saved.set(`p${i+1}`,{...p,id:`p${i+1}`,status:'published',hiddenTestCount:p.hiddenTests.length,updatedAt:Date.now()}));
      contest={id:'c-ai',...body.contest,status:'draft',problems:body.problems.map((p,i)=>({problemId:`p${i+1}`,points:p.points,label:'ABCD'[i]}))};
     }
     if(failImport){failImport=false;return route.fulfill({status:503,json:{error:'Mô phỏng mất phản hồi sau khi lưu. Hãy thử lại.'}});}
     return route.fulfill({json:{id:'c-ai',problemIds:[...saved.keys()],status:'draft'}});
    }
   }
   if(parts[3]==='contests')return route.fulfill({json:id?contest:[contest].filter(Boolean)});
   if(req.method()==='GET')return route.fulfill({json:id?saved.get(id):[...saved.values()].map(p=>({...p,hiddenTests:undefined}))});
   const value={...req.postDataJSON(),id};saved.set(id,value);return route.fulfill({json:{id}});
  });
  await page.goto(server.resolvedUrls.local[0]+'scripts/teacher-authoring-browser/fixture.html');
  await page.getByText('Công cụ hỗ trợ',{exact:true}).click();await page.getByRole('button',{name:'Nhập từ PDF bằng AI',exact:true}).click();await page.getByRole('dialog',{name:'Từ PDF đến contest'}).waitFor();
  await page.getByLabel('Chọn file PDF',{exact:true}).setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('not a PDF')});await page.getByRole('alert').filter({hasText:'File không phải PDF hợp lệ.'}).waitFor();
  await page.getByLabel('Chọn file PDF',{exact:true}).setInputFiles('imports/teacher-authoring-test/four-problems.pdf');
  await page.getByRole('button',{name:'AI phân tích đề →',exact:true}).click();await page.getByRole('alert').filter({hasText:'Backend đang chạy chưa có API đọc PDF bằng AI'}).waitFor();await page.getByRole('button',{name:'AI phân tích đề →',exact:true}).click();
  await page.getByLabel('Tên contest',{exact:true}).waitFor();assert.equal(await page.locator('.author-ai-problem').count(),4);assert.equal(analyzed,2);
  await page.getByRole('button',{name:'AI chuẩn bị bộ chấm cho 4 bài',exact:true}).click();await page.getByText('Đã chạy 2 lời giải, khớp 1 ví dụ gốc và 3 test mới.',{exact:false}).first().waitFor();
  // Wait until the complete batch finishes, not only the first problem.
  await page.getByRole('button',{name:'AI chuẩn bị bộ chấm cho 4 bài',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('.author-ai-problem .author-success').length===4);assert.equal(prepared,4);
  await page.getByLabel('Đề bài · bài 1',{exact:true}).fill('Cho hai số a,b. Hãy tính tổng.');
  assert.equal(await page.locator('.author-ai-problem').first().locator('.author-success').count(),0,'editing statements invalidates generated test verification');
  await page.locator('.author-ai-problem').first().getByRole('button',{name:'AI tạo & kiểm tra bộ chấm',exact:true}).click();await page.locator('.author-ai-problem').first().locator('.author-success').waitFor();
  await page.getByLabel('Tôi đã đối chiếu đề, công thức, ví dụ và các test chấm được chọn.').check();await page.getByLabel('Xuất bản các bài đã kiểm tra để contest sẵn sàng chấm bài.').check();
  await page.screenshot({path:`/tmp/teacher-ai-pdf-${width}.png`,fullPage:true});
  const button=page.getByRole('button',{name:'Tạo contest với 4 bài',exact:true});await button.click();await page.getByRole('alert').filter({hasText:'Mô phỏng mất phản hồi'}).waitFor();await button.click();
  await page.getByRole('heading',{name:'Chỉnh sửa contest',exact:true}).waitFor();assert.equal(imports,2);assert.equal(saved.size,4);assert.equal(await page.locator('.author-contest-problem').count(),4);assert.ok(await page.getByText('4/4 bài',{exact:true}).isVisible());
  await page.screenshot({path:`/tmp/teacher-ai-contest-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('link',{name:'Mở thư viện bài tập →'}).click();await page.locator('tbody').getByRole('link',{name:'Chỉnh sửa →'}).first().click();await page.getByRole('button',{name:'Xem trước',exact:true}).click();const preview=page.getByRole('region',{name:'Bản xem trước của học sinh'});await preview.waitFor();assert.ok(!(await preview.innerText()).includes('9 8'));
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}px: AI PDF request/retry, structured editing, generated-test invalidation, atomic retry, ready A–D contest, private preview`);
 }
 const page=await browser.newPage();await page.goto(server.resolvedUrls.local[0]+'scripts/teacher-authoring-browser/fixture.html');
 await page.getByText('Công cụ hỗ trợ',{exact:true}).click();await page.getByRole('button',{name:'Nhập từ PDF bằng AI',exact:true}).click();await page.getByLabel('Chọn file PDF',{exact:true}).setInputFiles('imports/teacher-authoring-test/four-problems.pdf');
 let started;const pending=new Promise(resolve=>{started=resolve;});await page.route('**/api/teacher/pdf/analyze',async()=>{started();});
 await page.getByRole('button',{name:'AI phân tích đề →',exact:true}).click();await pending;await page.getByRole('button',{name:'Dừng xử lý AI',exact:true}).click();await page.getByRole('button',{name:'AI phân tích đề →',exact:true}).waitFor();await page.getByRole('button',{name:'Đóng nhập PDF',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});await page.close();console.log('PASS AI cancellation and dialog cleanup');
}finally{await browser?.close();await server.close();}
