import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { listTeacherContests, listTeacherProblems, loadTeacherContest, saveTeacherContest, deleteTeacherContest } from '../services/contestService.js';
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
      {!state.value?<ContestError state={state}/>:<div className="contest-table-wrap"><table><thead><tr><th>Vòng thi</th><th>Trạng thái</th><th>Bắt đầu</th><th>Thời lượng / Đóng</th><th>Bài thi</th><th /></tr></thead><tbody>{visible.map(c=><tr key={c.id}><td><Link className="author-problem-title" to={`/teacher/contests/${c.id}/edit`}>{c.title}</Link></td><td>{c.status==='draft'?<span className="author-status">Bản nháp</span>:<ContestStatus contest={c} now={now}/>}</td><td>{new Date(c.startAt).toLocaleString('vi-VN')}</td><td>{c.durationMinutes} phút{c.endAt ? <small style={{display:'block',color:'#64748b',fontSize:'11px',fontWeight:600}}>Đóng: {new Date(c.endAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} ({new Date(c.endAt).toLocaleDateString('vi-VN')})</small> : ''}</td><td>{c.problems.length} bài</td><td><Link to={`/teacher/contests/${c.id}/edit`}>Chỉnh sửa</Link> · <Link to={`/teacher/contests/${c.id}/monitor`}>Theo dõi</Link></td></tr>)}{!visible.length&&<tr><td colSpan="6"><div className="author-empty"><Icon name="trophy"/><h3>Chưa có contest phù hợp</h3><p>Chọn các bài trong thư viện để tạo vòng thi mới.</p></div></td></tr>}</tbody></table></div>}
      {state.value&&state.error&&<p className="author-error" role="alert">{state.error}</p>}
    </section>
  </div>;
}

function localDate(ms) { const d=new Date(ms);return new Date(ms-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }

function ContestForm({initial,problems,contestId,selectedIds=[]}) {
  const [form,setForm]=useState(()=>initial?{...initial,startAt:localDate(initial.startAt),endAt:initial.endAt?localDate(initial.endAt):''}:{title:'',description:'',startAt:localDate(Date.now()+3600000),endAt:'',durationMinutes:150,problems:selectedIds.filter(id=>problems.some(p=>p.id===id)).map(problemId=>({problemId,points:100}))});
  const [busy,setBusy]=useState(false);
  const [deleting,setDeleting]=useState(false);
  const [error,setError]=useState('');
  const navigate=useNavigate();
  const {now}=useContestClock();
  const isEnded = initial ? contestPhase(initial, now) === 'ended' : false;
  const locked=initial?.status==='published'&&now>=initial.startAt;
  const ready=problems.filter(p=>p.status==='published'&&p.hiddenTestCount>0);
  const readyCount=form.problems.filter(entry=>ready.some(p=>p.id===entry.problemId)).length;
  const change=(key,value)=>setForm(old=>({...old,[key]:value}));

  function update(index,key,value){change('problems',form.problems.map((p,i)=>i===index?{...p,[key]:value}:p));}
  function move(index,offset){const next=[...form.problems];[next[index],next[index+offset]]=[next[index+offset],next[index]];change('problems',next);}

  const minEndMs = (form.startAt ? new Date(form.startAt).getTime() : Date.now()) + (Number(form.durationMinutes) || 0) * 60000;

  function addMinutesToEnd(mins) {
    const currentMs = form.endAt ? new Date(form.endAt).getTime() : (initial?.endAt || minEndMs);
    const base = Math.max(Date.now(), currentMs, minEndMs);
    change('endAt', localDate(base + mins * 60000));
  }

  function setEndEqualToDuration() {
    change('endAt', localDate(minEndMs));
  }

  function closeContestNow() {
    change('endAt', localDate(Math.max(minEndMs, Date.now() - 1000)));
  }

  async function save(status){
    try{
      const rawPayload = {
        ...form,
        startAt: new Date(form.startAt).getTime(),
        endAt: form.endAt ? new Date(form.endAt).getTime() : undefined,
      };
      const validated=validateContest(rawPayload,{status,publishedProblems:ready,minimumProblems:4});
      setBusy(true);
      setError('');
      await saveTeacherContest(contestId,{...validated,status});
      navigate('/teacher/contests');
    }
    catch(e){setError(e.message);}finally{setBusy(false);}
  }

  async function handleDeleteContest() {
    if (!contestId) return;
    const confirmMsg = locked
      ? `Contest "${form.title || 'này'}" đang diễn ra. Bạn có chắc chắn muốn XÓA VĨNH VIỄN contest này không? Học sinh sẽ không thể tiếp tục làm bài.`
      : `Bạn có chắc chắn muốn xóa contest "${form.title || 'này'}" không? Thao tác này sẽ xóa toàn bộ cấu hình vòng thi và không thể hoàn tác.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      setDeleting(true);
      setError('');
      await deleteTeacherContest(contestId);
      navigate('/teacher/contests');
    } catch(e) {
      setError(e.message || 'Không thể xóa contest lúc này.');
      setDeleting(false);
    }
  }

  return <><Link className="author-back" to="/teacher/contests">← Danh sách contest</Link><header className="author-editor-heading"><div><span className="author-kicker">THIẾT LẬP VÒNG THI</span><h1>{contestId?'Chỉnh sửa contest':'Tạo contest mới'}</h1><p className="author-muted">{locked ? (isEnded ? 'Contest đã kết thúc. Bạn có thể gia hạn thời gian kết thúc ở bên dưới để mở lại contest cho học sinh tiếp tục làm bài.' : 'Contest đang mở. Danh sách bài và thời gian bắt đầu được cố định để giữ công bằng; bạn có thể điều chỉnh thời gian kết thúc ở bên dưới.') : 'Chọn ít nhất 4 bài, sắp xếp A–D và đặt lịch thi cho học sinh.'}</p></div><Link className="contest-button" to="/teacher/problems">Mở thư viện bài tập →</Link></header>
    {locked&&<p role="status" className="author-notice">{isEnded ? '🔒 Contest đã kết thúc. Bạn có thể điều chỉnh thời gian kết thúc ở trường bên dưới để gia hạn và MỞ LẠI contest cho học sinh làm bài tiếp.' : '⚡ Contest đang mở. Bạn có thể điều chỉnh thời gian kết thúc ở trường bên dưới (gia hạn thêm giờ hoặc đóng contest sớm).'}</p>}{error&&<p role="alert" className="author-error">{error}</p>}
    <div className="author-contest-setup"><form className="author-form" onSubmit={e=>e.preventDefault()}><section className="author-section"><header className="author-section-heading"><div><h2>1. Thông tin vòng thi</h2><p>Tiêu đề và lịch thi được hiển thị trong đấu trường.</p></div></header><fieldset disabled={busy||deleting} className="author-flat-fieldset"><label>Tên contest<input disabled={locked} value={form.title} maxLength={300} placeholder="Ví dụ: Kiên Giang Practice Round #1" onChange={e=>change('title',e.target.value)} /></label><label>Mô tả<textarea disabled={locked} rows={3} value={form.description} onChange={e=>change('description',e.target.value)} placeholder="Chủ đề, phạm vi kiến thức và hướng dẫn cho học sinh…" /></label><div className="author-test-pair"><label>Thời gian bắt đầu (giờ trên thiết bị)<input disabled={locked} type="datetime-local" value={form.startAt} onChange={e=>change('startAt',e.target.value)} /></label><label>Thời lượng làm bài (phút)<input disabled={locked} type="number" min="1" max="1440" value={form.durationMinutes} onChange={e=>change('durationMinutes',Number(e.target.value))} /></label></div><div className="author-test-pair" style={{marginTop:'0.75rem'}}><label style={{width:'100%'}}>Thời gian kết thúc contest (Tùy chọn - Đóng contest tuyệt đối)<input type="datetime-local" min={localDate(minEndMs)} value={form.endAt||''} onChange={e=>change('endAt',e.target.value)} style={{border:locked?'2px solid #2563eb':undefined,background:locked?'#eff6ff':undefined}} /><small style={{display:'block',color:locked?'#1d4ed8':'#64748b',marginTop:'4px',fontSize:'12px',fontWeight:locked?600:400}}>{locked?(isEnded?'💡 Contest hiện đang đóng. Chọn mốc thời gian từ '+new Date(minEndMs).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})+' ngày '+new Date(minEndMs).toLocaleDateString('vi-VN')+' trở đi (phải dài hơn hoặc bằng '+form.durationMinutes+' phút) và bấm "Mở lại contest".':'⚡ Thời gian kết thúc phải dài hơn hoặc bằng thời gian làm bài ('+form.durationMinutes+' phút tính từ lúc bắt đầu). Hết mốc này contest sẽ đóng hoàn toàn.'):'💡 Thời gian kết thúc phải từ '+new Date(minEndMs).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})+' ngày '+new Date(minEndMs).toLocaleDateString('vi-VN')+' trở đi (dài hơn hoặc bằng thời lượng làm bài '+form.durationMinutes+' phút).'}</small>{<div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginTop:'8px'}}><span style={{fontSize:'12px',color:isEnded?'#1d4ed8':'#475569',alignSelf:'center',fontWeight:600}}>{isEnded?'Mở lại nhanh:':'Gợi ý nhanh:'}</span><button type="button" onClick={setEndEqualToDuration} style={{padding:'3px 8px',borderRadius:'6px',border:'1px solid #cbd5e1',background:'#f8fafc',fontSize:'12px',cursor:'pointer'}}>Bằng thời lượng ({form.durationMinutes}p)</button><button type="button" onClick={()=>addMinutesToEnd(15)} style={{padding:'3px 8px',borderRadius:'6px',border:'1px solid #cbd5e1',background:'#f8fafc',fontSize:'12px',cursor:'pointer'}}>+15 phút</button><button type="button" onClick={()=>addMinutesToEnd(30)} style={{padding:'3px 8px',borderRadius:'6px',border:'1px solid #cbd5e1',background:'#f8fafc',fontSize:'12px',cursor:'pointer'}}>+30 phút</button><button type="button" onClick={()=>addMinutesToEnd(60)} style={{padding:'3px 8px',borderRadius:'6px',border:'1px solid #cbd5e1',background:'#f8fafc',fontSize:'12px',cursor:'pointer'}}>+60 phút</button>{locked&&!isEnded&&now>=minEndMs&&<button type="button" onClick={closeContestNow} style={{padding:'3px 8px',borderRadius:'6px',border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontSize:'12px',cursor:'pointer',fontWeight:600}}>Đóng contest ngay</button>}</div>}</label></div></fieldset></section>
      <section className="author-section"><header className="author-section-heading"><div><h2>2. Chọn và sắp xếp bài thi</h2><p>Có thể ghép bài nháp để chuẩn bị. Xuất bản yêu cầu tất cả bài đã có ví dụ và test chấm.</p></div><span className="author-count">{form.problems.length}/26</span></header><fieldset disabled={busy||deleting||locked} className="author-flat-fieldset">{form.problems.map((entry,index)=><div className="author-contest-problem" key={index}><span className="contest-letter">{String.fromCharCode(65+index)}</span><label>Bài {String.fromCharCode(65+index)}<select aria-label={`Bài ${String.fromCharCode(65+index)}`} value={entry.problemId} onChange={e=>update(index,'problemId',e.target.value)}><option value="">Chọn bài từ thư viện</option>{problems.map(p=><option key={p.id} value={p.id} disabled={p.id!==entry.problemId&&form.problems.some(x=>x.problemId===p.id)}>{p.title}{p.status!=='published'?' · Bản nháp':''}</option>)}</select>{entry.problemId&&<Link to={`/teacher/problems/${entry.problemId}/edit`}>Sửa nội dung bài →</Link>}</label><label>Điểm<input type="number" min="1" max="10000" value={entry.points} onChange={e=>update(index,'points',Number(e.target.value))}/></label><div className="author-contest-controls"><button type="button" disabled={index===0} aria-label={`Đưa bài ${index+1} lên`} onClick={()=>move(index,-1)}>↑</button><button type="button" disabled={index===form.problems.length-1} aria-label={`Đưa bài ${index+1} xuống`} onClick={()=>move(index,1)}>↓</button><button type="button" aria-label={`Xóa bài ${index+1}`} onClick={()=>change('problems',form.problems.filter((_,i)=>i!==index))}><Icon name="trash"/></button></div></div>)}
      {!form.problems.length&&<p className="author-muted">Chưa chọn bài. Thêm các bài từ thư viện và sắp xếp theo thứ tự học sinh sẽ thấy.</p>}<div className="contest-actions"><button type="button" disabled={form.problems.length>=26||!problems.length} onClick={()=>change('problems',[...form.problems,{problemId:'',points:100}])}>+ Thêm bài thi</button><Link to="/teacher/problems/new">Soạn bài mới →</Link></div>{!problems.length&&<p className="author-notice">Thư viện đang trống. Hãy soạn bài mới hoặc <Link to="/teacher/problems">mở thư viện bài tập</Link> để bắt đầu.</p>}</fieldset></section>
    </form><aside className="author-publish-panel"><section className="author-section"><span className="author-kicker">KIỂM TRA & ĐĂNG TẢI</span><h2>Tổng quan contest</h2><ul className="author-contest-summary"><li><span>Số bài thi</span><strong>{form.problems.length} / tối thiểu 4</strong></li><li><span>Sẵn sàng chấm</span><strong>{readyCount}/{form.problems.length} bài</strong></li><li><span>Tổng điểm</span><strong>{form.problems.reduce((sum,p)=>sum+p.points,0)}</strong></li><li><span>Thời lượng</span><strong>{form.durationMinutes} phút</strong></li>{form.endAt&&<li><span>Đóng contest</span><strong>{new Date(form.endAt).toLocaleString('vi-VN')}</strong></li>}</ul><p className="author-muted">Xuất bản sẽ khóa nội dung và test của các bài đến khi vòng thi kết thúc.</p><div className="author-publish-actions">{locked?<button type="button" className="contest-primary" disabled={busy||deleting} onClick={()=>save('published')}>{busy?'Đang cập nhật…':(isEnded?'Mở lại contest':'Cập nhật thời gian kết thúc')}</button>:<><button type="button" disabled={busy||deleting} onClick={()=>save('draft')}>Lưu contest nháp</button><button type="button" className="contest-primary" disabled={busy||deleting} onClick={()=>save('published')}>{busy?'Đang lưu…':'Xuất bản contest'}</button></>} {contestId&&<button type="button" disabled={busy||deleting} onClick={handleDeleteContest} style={{marginTop:'0.75rem',width:'100%',padding:'8px 12px',borderRadius:'8px',border:'1px solid #fecaca',background:'#fef2f2',color:'#dc2626',fontWeight:600,fontSize:'13px',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'6px'}}><Icon name="trash"/><span>{deleting?'Đang xóa…':'Xóa contest này'}</span></button>}</div></section></aside></div>
  </>;
}
export function TeacherContestEditor(){
  const {contestId}=useParams();const {state:locationState}=useLocation();
  const loader=useCallback(async()=>({contest:contestId?await loadTeacherContest(contestId):null,problems:await listTeacherProblems()}),[contestId]);
  const state=useContestData(loader);
  if(!state.value)return <ContestError state={state}/>;
  return <div className="content contest-ui author-page"><TeacherAuthoringNav/><ContestForm key={contestId??'new'} contestId={contestId} initial={state.value.contest} problems={state.value.problems} selectedIds={locationState?.problemIds??[]}/></div>;
}
