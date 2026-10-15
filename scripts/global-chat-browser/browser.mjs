import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const root=fileURLToPath(new URL('../../',import.meta.url));
const announcementMock=`export const ANNOUNCEMENT_TYPES={general:{label:'Thông báo',icon:'bell'}};export const subscribeAnnouncements=(callback)=>{callback([]);return ()=>{};}; export const getReadNotificationIds=()=>[];export const markNotificationAsRead=()=>{};export const markAllNotificationsAsRead=()=>{};export const createAnnouncement=async()=>{};`;
const server=await createServer({root,server:{host:'127.0.0.1',port:0},plugins:[{name:'mock-announcements',enforce:'pre',resolveId(id){if(id.endsWith('/services/announcementService') || id.endsWith('/services/announcementService.js'))return '\0announcement-mock';},load(id){if(id==='\0announcement-mock')return announcementMock;}}]});
let browser;
try {
 await server.listen();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const origin=server.resolvedUrls.local[0];
 for (const width of [1280,390]) {
  const page=await browser.newPage({viewport:{width,height:850}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let calls=0,mode='ok';let lastBody;
  await page.route('**/api/ai/global-chat',async route=>{
   calls++;lastBody=route.request().postDataJSON();
   if(mode==='pending'){await new Promise(resolve=>setTimeout(resolve,1200));}
   try {await route.fulfill({status:mode==='error'?502:200,contentType:'application/json',body:JSON.stringify(mode==='error'?{error:'Lỗi mô phỏng'}:{message:'Chia đôi phạm vi để tìm kiếm.',suggestedActions:[]})});} catch { /* A canceled request may already be gone. */ }
  });
  await page.goto(origin+'scripts/global-chat-browser/fixture.html');
  const trigger=page.getByRole('button',{name:'Trò chuyện với Peanut AI',exact:true});
  await trigger.waitFor();assert.equal(await page.getByText('VI',{exact:true}).count(),0);
  await trigger.click();const dialog=page.getByRole('dialog',{name:'Peanut AI',exact:true});await dialog.waitFor();assert.equal(calls,0);
  const input=page.getByLabel('Hỏi Peanut AI',{exact:true});assert.equal(await input.evaluate(e=>e===document.activeElement),true);
  await input.fill('Giải thích Binary Search');await input.press('Enter');await page.getByText('Chia đôi phạm vi để tìm kiếm.',{exact:true}).waitFor();
  assert.deepEqual(Object.keys(lastBody).sort(),['history','language','message','pageContext']);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
  await page.getByRole('link',{name:'Chương trình',exact:true}).click();await trigger.click();await page.getByText('Chia đôi phạm vi để tìm kiếm.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Cuộc trò chuyện mới',exact:true}).click();assert.equal(await page.getByText('Chia đôi phạm vi để tìm kiếm.',{exact:true}).count(),0);
  await input.fill('Dòng một');await input.press('Shift+Enter');await input.press('x');assert.match(await input.inputValue(),/\n/);
  mode='error';await input.fill('Thử lỗi');await input.press('Enter');await page.getByRole('alert').filter({hasText:'Lỗi mô phỏng'}).waitFor();
  mode='ok';await page.getByRole('button',{name:'Thử gửi lại'}).click();await page.getByText('Chia đôi phạm vi để tìm kiếm.',{exact:true}).waitFor();
  mode='pending';await input.fill('Dừng yêu cầu');await input.press('Enter');await page.getByRole('button',{name:'Dừng trả lời'}).click();assert.equal(await page.getByRole('button',{name:'Gửi',exact:true}).count(),1);
  await page.screenshot({path:`/tmp/peanut-global-${width}.png`});
  const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await page.keyboard.press('Escape');await page.getByRole('link',{name:'Vào Contest'}).click();await trigger.waitFor({state:'detached'});assert.equal(await trigger.count(),0);assert.equal(await dialog.count(),0);
  await page.getByRole('link',{name:'Dashboard',exact:true}).click();await trigger.waitFor();assert.equal(await dialog.count(),0);
  await page.getByRole('button',{name:'Thông báo',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Thông báo',exact:true}).getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Menu tài khoản'}).click();assert.equal(await page.getByRole('button',{name:'Menu tài khoản'}).getAttribute('aria-expanded'),'true');
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS Global Peanut AI browser at ${width}px`);
 }
} finally {await browser?.close();await server.close();}
