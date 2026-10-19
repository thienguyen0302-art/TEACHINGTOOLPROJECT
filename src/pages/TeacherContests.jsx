import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { listTeacherContests, listTeacherProblems, loadTeacherContest, saveTeacherContest } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { validateContest, contestPhase } from '../utils/contest.js';
import { ContestError, ContestStatus } from '../components/ContestUI.jsx';
import TeacherAuthoringNav from '../components/TeacherAuthoringNav.jsx';
import Icon from '../components/Icon.jsx';
import './Contest.css';
import './TeacherAuthoring.css';
export default function TeacherContests() {
  const state = useContestData(listTeacherContests);
  const [search,setSearch] = useState('');
  const {now} = useContestClock();
  const visible=(state.value??[]).filter(c=>c.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))).sort((a,b)=>b.startAt-a.startAt);
  return <div className="content contest-ui author-page"><TeacherAuthoringNav /><header className="author-hero"><div><span className="author-kicker">KHÔNG GIAN GIÁO VIÊN</span><h1>Quản lý contest</h1><p>Ghép bài tập thành vòng thi, đặt lịch và theo dõi kết quả lớp học.</p></div><div className="author-hero-actions"><Link className="contest-button author-light-button" to="/teacher/problems">Thư viện bài tập</Link><Link className="contest-button contest-primary" to="/teacher/contests/new">+ Tạo contest</Link></div></header>
    <div className="author-summary"><div><Icon name="trophy" /><p><strong>{state.value?.length??0}</strong><span>Tổng vòng thi</span></p></div><div><Icon name="history" /><p><strong>{state.value?.filter(c=>c.status==='draft').length??0}</strong><span>Bản nháp</span></p></div><div><Icon name="clock" /><p><strong>{state.value?.filter(c=>c.status==='published'&&contestPhase(c,now)==='running').length??0}</strong><span>Đang diễn ra</span></p></div></div>
    <section className="author-library"><header className="author-library-heading"><div><h2>Các vòng thi</h2><p>Chuẩn bị bài tập → Cấu hình vòng thi → Kiểm tra và xuất bản.</p></div><label className="author-search"><Icon name="search" /><input aria-label="Tìm contest" type="search" placeholder="Tìm theo tên contest…" value={search} onChange={e=>setSearch(e.target.value)} /></label></header>
      {!state.value?<ContestError state={state}/>:<div className="contest-table-wrap"><table><thead><tr><th>Vòng thi</th><th>Trạng thái</th><th>Bắt đầu</th><th>Thời lượng</th><th>Bài thi</th><th /></tr></thead><tbody>{visible.map(c=><tr key={c.id}><td><Link className="author-problem-title" to={`/teacher/contests/${c.id}/edit`}>{c.title}</Link></td><td>{c.status==='draft'?<span className="author-status">Bản nháp</span>:<ContestStatus contest={c} now={now}/>}</td><td>{new Date(c.startAt).toLocaleString('vi-VN')}</td><td>{c.durationMinutes} phút</td><td>{c.problems.length} bài</td><td><Link to={`/teacher/contests/${c.id}/edit`}>Chỉnh sửa</Link> · <Link to={`/teacher/contests/${c.id}/monitor`}>Theo dõi</Link></td></tr>)}{!visible.length&&<tr><td colSpan="6"><div className="author-empty"><Icon name="trophy"/><h3>Chưa có contest phù hợp</h3><p>Chọn các bài trong thư viện để tạo vòng thi mới.</p></div></td></tr>}</tbody></table></div>}
      {state.value&&state.error&&<p className="author-error" role="alert">{state.error}</p>}
    </section></div>;
}
function localDate(ms) { const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
function ContestForm({initial,problems,contestId,selectedIds=[]}) {
  const [form,setForm]=useState(()=>initial?{...initial,startAt:localDate(initial.startAt)}:{title:'',description:'',startAt:localDate(Date.now()+3600000),durationMinutes:150,problems:selectedIds.filter(id=>problems.some(p=>p.id===id)).map(problemId=>({problemId,points:100}))});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const navigate=useNavigate();const {now}=useContestClock();
  const locked=initial?.status==='published'&&now>=initial.startAt;
  const ready=problems.filter(p=>p.status==='published'&&p.hiddenTestCount>0);
  const readyCount=form.problems.filter(entry=>ready.some(p=>p.id===entry.problemId)).length;
  const change=(key,value)=>setForm(old=>({...old,[key]:value}));
  function update(index,key,value){change('problems',form.problems.map((p,i)=>i===index?{...p,[key]:value}:p));}
  function move(index,offset){const next=[...form.problems];[next[index],next[index+offset]]=[next[index+offset],next[index]];change('problems',next);}
  async function save(status){
    try{const validated=validateContest({...form,startAt:new Date(form.startAt).getTime()},{status,publishedProblems:ready,minimumProblems:4});setBusy(true);setError('');await saveTeacherContest(contestId,{...validated,status});navigate('/teacher/contests');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <><Link className="author-back" to="/teacher/contests">← Danh sách contest</Link><header className="author-editor-heading"><div><span className="author-kicker">THIẾT LẬP VÒNG THI</span><h1>{contestId?'Chỉnh sửa contest':'Tạo contest mới'}</h1><p className="author-muted">Chọn ít nhất 4 bài, sắp xếp A–D và đặt lịch thi cho học sinh.</p></div><Link className="contest-button" to="/teacher/problems">Mở thư viện bài tập →</Link></header>
    {locked&&<p role="status" className="author-notice">Contest đã bắt đầu. Cấu hình thi được khóa để giữ công bằng.</p>}{error&&<p role="alert" className="author-error">{error}</p>}
    <div className="author-contest-setup"><form className="author-form" onSubmit={e=>e.preventDefault()}><section className="author-section"><header className="author-section-heading"><div><h2>1. Thông tin vòng thi</h2><p>Tiêu đề và lịch thi được hiển thị trong đấu trường.</p></div></header><fieldset disabled={busy||locked} className="author-flat-fieldset"><label>Tên contest<input value={form.title} maxLength={300} placeholder="Ví dụ: Kiên Giang Practice Round #1" onChange={e=>change('title',e.target.value)} /></label><label>Mô tả<textarea rows={3} value={form.description} onChange={e=>change('description',e.target.value)} placeholder="Chủ đề, phạm vi kiến thức và hướng dẫn cho học sinh…" /></label><div className="author-test-pair"><label>Thời gian bắt đầu (giờ trên thiết bị)<input type="datetime-local" value={form.startAt} onChange={e=>change('startAt',e.target.value)} /></label><label>Thời lượng (phút)<input type="number" min="1" max="1440" value={form.durationMinutes} onChange={e=>change('durationMinutes',Number(e.target.value))} /></label></div></fieldset></section>
      <section className="author-section"><header className="author-section-heading"><div><h2>2. Chọn và sắp xếp bài thi</h2><p>Có thể ghép bài nháp để chuẩn bị. Xuất bản yêu cầu tất cả bài đã có ví dụ và test chấm.</p></div><span className="author-count">{form.problems.length}/26</span></header><fieldset disabled={busy||locked} className="author-flat-fieldset">{form.problems.map((entry,index)=><div className="author-contest-problem" key={index}><span className="contest-letter">{String.fromCharCode(65+index)}</span><label>Bài {String.fromCharCode(65+index)}<select aria-label={`Bài ${String.fromCharCode(65+index)}`} value={entry.problemId} onChange={e=>update(index,'problemId',e.target.value)}><option value="">Chọn bài từ thư viện</option>{problems.map(p=><option key={p.id} value={p.id} disabled={p.id!==entry.problemId&&form.problems.some(x=>x.problemId===p.id)}>{p.title}{p.status!=='published'?' · Bản nháp':''}</option>)}</select>{entry.problemId&&<Link to={`/teacher/problems/${entry.problemId}/edit`}>Sửa nội dung bài →</Link>}</label><label>Điểm<input type="number" min="1" max="10000" value={entry.points} onChange={e=>update(index,'points',Number(e.target.value))}/></label><div className="author-contest-controls"><button type="button" disabled={index===0} aria-label={`Đưa bài ${index+1} lên`} onClick={()=>move(index,-1)}>↑</button><button type="button" disabled={index===form.problems.length-1} aria-label={`Đưa bài ${index+1} xuống`} onClick={()=>move(index,1)}>↓</button><button type="button" aria-label={`Xóa bài ${index+1}`} onClick={()=>change('problems',form.problems.filter((_,i)=>i!==index))}><Icon name="trash"/></button></div></div>)}
      {!form.problems.length&&<p className="author-muted">Chưa chọn bài. Thêm các bài từ thư viện và sắp xếp theo thứ tự học sinh sẽ thấy.</p>}<div className="contest-actions"><button type="button" disabled={form.problems.length>=26||!problems.length} onClick={()=>change('problems',[...form.problems,{problemId:'',points:100}])}>+ Thêm bài thi</button><Link to="/teacher/problems/new">Soạn bài mới →</Link></div>{!problems.length&&<p className="author-notice">Thư viện đang trống. Hãy soạn bài mới hoặc <Link to="/teacher/problems">mở thư viện bài tập</Link> để bắt đầu.</p>}</fieldset></section>
    </form><aside className="author-publish-panel"><section className="author-section"><span className="author-kicker">KIỂM TRA & ĐĂNG TẢI</span><h2>Tổng quan contest</h2><ul className="author-contest-summary"><li><span>Số bài thi</span><strong>{form.problems.length} / tối thiểu 4</strong></li><li><span>Sẵn sàng chấm</span><strong>{readyCount}/{form.problems.length} bài</strong></li><li><span>Tổng điểm</span><strong>{form.problems.reduce((sum,p)=>sum+p.points,0)}</strong></li><li><span>Thời lượng</span><strong>{form.durationMinutes} phút</strong></li></ul><p className="author-muted">Xuất bản sẽ khóa nội dung và test của các bài đến khi vòng thi kết thúc.</p><div className="author-publish-actions"><button type="button" disabled={busy||locked} onClick={()=>save('draft')}>Lưu contest nháp</button><button type="button" className="contest-primary" disabled={busy||locked} onClick={()=>save('published')}>{busy?'Đang lưu…':'Xuất bản contest'}</button></div></section></aside></div>
  </>;
}
export function TeacherContestEditor(){
  const {contestId}=useParams();const {state:locationState}=useLocation();
  const loader=useCallback(async()=>({contest:contestId?await loadTeacherContest(contestId):null,problems:await listTeacherProblems()}),[contestId]);
  const state=useContestData(loader);
  if(!state.value)return <ContestError state={state}/>;
  return <div className="content contest-ui author-page"><TeacherAuthoringNav/><ContestForm key={contestId??'new'} contestId={contestId} initial={state.value.contest} problems={state.value.problems} selectedIds={locationState?.problemIds??[]}/></div>;
}
