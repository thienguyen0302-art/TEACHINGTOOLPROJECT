import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const mocks={
 'firebase':`export const auth={currentUser:{uid:'fixture'}};export const db=null;`,
 'announcementService':`export const ANNOUNCEMENT_TYPES={general:{label:'Thông báo',icon:'bell'}};export const subscribeAnnouncements=cb=>{cb([]);return()=>{};};export const getReadNotificationIds=()=>[];export const markNotificationAsRead=()=>{};export const markAllNotificationsAsRead=()=>{};export const createAnnouncement=async()=>{};export const updateAnnouncement=async()=>{};export const deleteAnnouncement=async()=>{};export const togglePinAnnouncement=async()=>{};`,
 'goalService':`export const subscribeGoals=(uid,cb)=>{cb([]);return()=>{};};export const saveGoal=async()=>{};export const toggleGoalCompleted=async()=>{};export const deleteGoal=async()=>{};export const getDueGoals=()=>[];`,
 'submissionPersistence':`export const getCodeSubmissionHistory=async()=>[{id:'s1',problemId:'bai-tong-mau',slug:'practice/p1',language:'cpp',solved:true,bestScore:100,attempts:2,lastSubmittedAt:1720000000000}];`,
 'contestService':`export const listContests=async()=>[{id:'c1',title:'Contest được giữ lại'}];export const loadContestSubmissions=async()=>[{problemId:'p1',earnedPoints:100,submittedAt:1720000000000}];`,
};
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{name:'history-fixtures',enforce:'pre',resolveId(id){for(const key of Object.keys(mocks)){if(id.endsWith('/services/'+key)||id.endsWith('/services/'+key+'.js'))return '\0fixture:'+key;}},load(id){if(id.startsWith('\0fixture:'))return mocks[id.slice(9)];}}]});let browser;
try{
 await server.listen();browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(server.resolvedUrls.local[0]+'scripts/student-history-browser/fixture.html');
  await page.getByRole('heading',{name:'Lịch sử nộp bài & Kết quả học tập'}).waitFor();
  await page.getByText('bai-tong-mau',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:/Đề thi HSG/}).count(),0);assert.equal(await page.getByRole('button',{name:'Luyện đề HSG',exact:true}).count(),0);
  await page.getByRole('button',{name:/Kỳ thi Contest HSG/}).click();await page.getByText('Contest được giữ lại',{exact:true}).waitFor();
  await page.getByRole('button',{name:/Bài nộp Code/}).click();await page.getByText('bai-tong-mau',{exact:true}).waitFor();
  if(width<600){await page.getByRole('button',{name:/Mở menu|Mở thanh điều hướng/}).click();}
  await page.getByRole('button',{name:'Lịch sử nộp bài',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/submissions');
  if(width<600){await page.getByRole('button',{name:/Mở menu|Mở thanh điều hướng/}).click();}
  await page.getByRole('button',{name:'Trợ giúp',exact:true}).click();await page.getByRole('navigation',{name:'Danh mục trợ giúp'}).getByRole('button',{name:'Contest HSG',exact:true}).click();await page.getByRole('heading',{name:'Quy chế thi Contest HSG'}).waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('Luyện đề HSG'));assert.deepEqual(errors,[]);
  await page.screenshot({path:`/tmp/student-history-${width}.png`,fullPage:true});await page.close();console.log(`PASS ${width}px: no HSG exam entry, code history and contest history retained, help updated`);
 }
}finally{await browser?.close();await server.close();}
