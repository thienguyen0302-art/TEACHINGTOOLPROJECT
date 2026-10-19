import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const saved=new Map();let serial=0,aiCalls=0;
  await page.route('**/api/**',async route=>{
   const req=route.request(),parts=new URL(req.url()).pathname.split('/'),id=parts[4];
   if(parts[3]==='pdf'){aiCalls++;return route.fulfill({status:500,json:{error:'AI must not be used for manual authoring'}});}
   if(req.method()==='GET')return route.fulfill({json:id?saved.get(id):[...saved.values()].map(p=>({...p,hiddenTests:undefined,hiddenTestCount:p.hiddenTests.length}))});
   const value={...req.postDataJSON(),id:id??`p${++serial}`,updatedAt:Date.now()};saved.set(value.id,value);return route.fulfill({json:{id:value.id}});
  });
  await page.goto(server.resolvedUrls.local[0]+'scripts/teacher-authoring-browser/fixture.html');
  assert.equal(await page.getByRole('button',{name:'Nhập từ PDF',exact:true}).count(),0);
  await page.getByRole('link',{name:'+ Soạn bài mới',exact:true}).click();await page.getByLabel('Tên bài tập',{exact:true}).waitFor();
  assert.equal(await page.locator('.author-editor-tabs').count(),0);
  assert.equal(await page.locator('.simple-advanced').getAttribute('open'),null);
  assert.equal(await page.locator('.simple-structured').getAttribute('open'),null);
  const statement='Nhập hai số nguyên a và b.\nDữ liệu vào: a b.\nDữ liệu ra: tổng a+b.\nGiới hạn: 0 ≤ a,b ≤ 100.';
  await page.getByLabel('Tên bài tập',{exact:true}).fill('Tổng hai số');await page.getByLabel('Đề bài',{exact:true}).fill(statement);
  await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await page.getByRole('heading',{name:'Chỉnh sửa bài tập',exact:true}).waitFor();
  assert.equal(saved.size,1);assert.equal(saved.get('p1').status,'draft');assert.equal(saved.get('p1').statement,statement);assert.equal(saved.get('p1').inputDescription,'');assert.match(saved.get('p1').slug,/^tong-hai-so-[a-z0-9]+$/);
  await page.getByLabel('Ví dụ 1 · Dữ liệu vào',{exact:true}).fill('2 3');await page.getByLabel('Ví dụ 1 · Kết quả đúng',{exact:true}).fill('5');
  await page.getByRole('button',{name:'Xuất bản bài tập',exact:true}).click();await page.getByRole('alert').filter({hasText:'Thêm ít nhất một test chấm riêng'}).waitFor();assert.equal(saved.get('p1').status,'draft');
  await page.getByRole('button',{name:'+ Thêm test chấm',exact:true}).click();await page.getByLabel('Test 1 · Dữ liệu vào',{exact:true}).fill('99 1');await page.getByLabel('Test 1 · Kết quả đúng',{exact:true}).fill('100');
  // Publication is one action once the required content exists; no preview checkbox flow.
  await page.getByRole('button',{name:'Xuất bản bài tập',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã xuất bản.'}).waitFor();assert.equal(saved.get('p1').status,'published');assert.equal(saved.get('p1').hiddenTests[0].output,'100');
  await page.getByRole('button',{name:'Xem trước',exact:true}).click();const preview=page.getByRole('region',{name:'Bản xem trước của học sinh'});await preview.waitFor();const text=await preview.innerText();assert.ok(text.includes(statement));assert.ok(!text.includes('99 1'));
  assert.equal(await preview.getByRole('heading',{name:'Dữ liệu vào',exact:true}).count(),0,'pasted full statement must not acquire empty duplicate sections');
  await page.getByRole('button',{name:'Đóng xem trước',exact:true}).click();
  await page.getByLabel('Tên bài tập',{exact:true}).fill('Tổng hai số cập nhật');await page.getByRole('button',{name:'Xuất bản bài tập',exact:true}).click();await page.getByRole('status').filter({hasText:'Đã xuất bản.'}).waitFor();assert.equal(saved.get('p1').title,'Tổng hai số cập nhật');
  assert.equal(aiCalls,0);assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`/tmp/teacher-simple-${width}.png`,fullPage:true});await page.close();console.log(`PASS ${width}px: one-page manual authoring, full statement, draft/edit/publish, required private tests, preview, no AI calls`);
 }
}finally{await browser?.close();await server.close();}
