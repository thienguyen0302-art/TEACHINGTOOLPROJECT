import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let calls=0,writes=0,mode='error',release,started,saved;
  const generated={hiddenTests:[{input:'9 8',output:'17'},{input:'2 3',output:'5'},{input:'0 0',output:'0'}],warnings:[],verification:{samplesChecked:1,testsChecked:3,referenceImplementations:2}};
  await page.route('**/api/**',async route=>{
   const req=route.request();
   if(req.url().endsWith('/api/teacher/problems/generate-tests')){
    calls++;const body=req.postDataJSON();assert.equal(body.problem.hiddenTests,undefined);assert.equal(body.maxTests,8);
    if(mode==='error')return route.fulfill({status:422,json:{error:'Hai lời giải AI cho kết quả khác nhau. Không lưu bộ test.'}});
    if(mode==='pending'){started();await new Promise(resolve=>{release=resolve;});try{await route.fulfill({json:generated});}catch{/* Request canceled by the teacher. */}return;}
    return route.fulfill({json:generated});
   }
   if(req.method()==='GET')return route.fulfill({json:req.url().endsWith('/p1')?saved:[]});
   writes++;saved={...req.postDataJSON(),id:'p1',updatedAt:Date.now()};return route.fulfill({json:{id:'p1'}});
  });
  await page.goto(server.resolvedUrls.local[0]+'scripts/teacher-authoring-browser/fixture.html');await page.getByRole('link',{name:'+ Soạn bài mới',exact:true}).click();
  const generate=page.getByRole('button',{name:'Tạo test tự động',exact:true});await generate.click();await page.getByRole('alert').filter({hasText:'Nhập tên và nội dung đề'}).waitFor();assert.equal(calls,0);
  await page.getByLabel('Tên bài tập',{exact:true}).fill('Tổng hai số');await page.getByLabel('Đề bài',{exact:true}).fill('Nhập hai số nguyên a,b. In a+b.');await generate.click();await page.getByRole('alert').filter({hasText:'Thêm ít nhất một ví dụ'}).waitFor();assert.equal(calls,0);
  await page.getByLabel('Ví dụ 1 · Dữ liệu vào',{exact:true}).fill('2 3');await page.getByLabel('Ví dụ 1 · Kết quả đúng',{exact:true}).fill('5');
  await page.getByRole('button',{name:'+ Thêm test chấm',exact:true}).click();await page.getByLabel('Test 1 · Dữ liệu vào',{exact:true}).fill('9 8');await page.getByLabel('Test 1 · Kết quả đúng',{exact:true}).fill('17');
  await generate.click();await page.getByRole('alert').filter({hasText:'Hai lời giải AI'}).waitFor();assert.equal(await page.getByLabel('Test 1 · Kết quả đúng',{exact:true}).inputValue(),'17');assert.equal(writes,0);
  mode='pending';const pending=new Promise(resolve=>{started=resolve;});await generate.click();await pending;await page.getByRole('button',{name:'Dừng tạo test',exact:true}).click();await generate.waitFor();await page.waitForFunction(()=>!document.querySelector('.auto-test-generator__heading button').disabled);release();assert.equal(writes,0);
  mode='ok';await generate.click();const add=page.getByRole('button',{name:'Thêm test vào bài',exact:true});await add.waitFor();assert.equal(await page.locator('#simple-tests .simple-test-card').count(),1);assert.equal(writes,0);
  await page.getByLabel('Đề bài',{exact:true}).fill('Nhập hai số nguyên không âm a,b. In a+b.');assert.equal(await add.isDisabled(),true);await page.getByText('Đề hoặc ví dụ đã thay đổi.',{exact:false}).waitFor();
  await generate.click();await add.waitFor();await add.click();await page.getByRole('status').filter({hasText:'Đã thêm 1 test vào bài'}).waitFor();
  assert.equal(await page.locator('#simple-tests .simple-test-card').count(),2);assert.equal(await page.getByLabel('Test 1 · Dữ liệu vào',{exact:true}).inputValue(),'9 8');assert.equal(await page.getByLabel('Test 2 · Kết quả đúng',{exact:true}).inputValue(),'0');assert.equal(writes,0);
  await page.screenshot({path:`/tmp/teacher-auto-tests-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Lưu nháp',exact:true}).click();await page.getByRole('heading',{name:'Chỉnh sửa bài tập',exact:true}).waitFor();assert.equal(writes,1);assert.equal(saved.hiddenTests.length,2);assert.equal(saved.status,'draft');assert.equal(calls,4);
  await page.getByRole('button',{name:'Xem trước',exact:true}).click();const preview=page.getByRole('region',{name:'Bản xem trước của học sinh'});await preview.waitFor();assert.ok(!(await preview.innerText()).includes('9 8'));
  assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.close();console.log(`PASS ${width}px: prerequisites, rejected references, cancel, stale result, deduplicate/append, explicit save, hidden preview`);
 }
}finally{await browser?.close();await server.close();}
