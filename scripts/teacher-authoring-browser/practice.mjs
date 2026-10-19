import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {authoredProblem} from '../../server/contestTestSupport.js';
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const p={...authoredProblem({id:'p1',title:'Bài luyện tập dùng chung',practicePublished:false}),hiddenTestCount:1};let toggles=0;
 const publicProblem=()=>{const {hiddenTests,...value}=p;assert.ok(hiddenTests);return value;};
 await page.route('**/api/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path==='/api/teacher/problems/p1/practice'){p.practicePublished=req.postDataJSON().published;toggles++;return route.fulfill({json:{id:'p1'}});}
  if(path==='/api/teacher/problems')return route.fulfill({json:[publicProblem()]});
  if(path==='/api/teacher/contests')return route.fulfill({json:[]});
  if(path==='/api/practice')return route.fulfill({json:p.practicePublished?[publicProblem()]:[]});
  if(path==='/api/practice/p1')return route.fulfill({json:publicProblem()});
  return route.fulfill({status:404,json:{error:'Unknown fixture route'}});
 });
 await page.goto(server.resolvedUrls.local[0]+'scripts/teacher-authoring-browser/fixture.html');
 await page.getByRole('button',{name:'Đăng vào kho học sinh',exact:true}).click();await page.getByRole('button',{name:'Gỡ khỏi kho học sinh',exact:true}).waitFor();assert.equal(toggles,1);
 await page.getByRole('link',{name:'Tạo contest từ bài này'}).click();await page.getByRole('heading',{name:'Tạo contest mới'}).waitFor();assert.equal(await page.getByLabel('Bài A',{exact:true}).inputValue(),'p1');
 await page.evaluate(()=>{history.pushState({},'','/practice');dispatchEvent(new PopStateEvent('popstate'));});
 await page.getByRole('link',{name:p.title,exact:true}).click();await page.getByRole('heading',{name:p.title,exact:true}).waitFor();
 assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_INPUT'));
 assert.equal(await page.getByRole('button',{name:'Nộp bài ↑'}).count(),1);
 await page.evaluate(()=>{history.pushState({},'','/teacher/problems');dispatchEvent(new PopStateEvent('popstate'));});
 await page.getByRole('button',{name:'Gỡ khỏi kho học sinh',exact:true}).click();await page.getByRole('button',{name:'Đăng vào kho học sinh',exact:true}).waitFor();assert.equal(toggles,2);
 assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`/tmp/teacher-practice-${width}.png`,fullPage:true});await page.close();console.log(`PASS ${width}px: publish/remove practice, reuse in contest, student bank and private statement`);
 }
}finally{await browser?.close();await server.close();}
