import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listTeacherContests, listTeacherProblems, loadTeacherContest, saveTeacherContest } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { validateContest } from '../utils/contest.js';
import { ContestError } from '../components/ContestUI.jsx';
import TeacherAuthoringNav from '../components/TeacherAuthoringNav.jsx';
import './Contest.css';
export default function TeacherContests() {
  const state = useContestData(listTeacherContests);
  return <div className="content contest-ui"><TeacherAuthoringNav /><header className="contest-heading"><h1>Quản lý contest</h1><Link className="contest-button" to="/teacher/contests/new">+ Tạo contest</Link></header>{!state.value ? <ContestError state={state} /> : <div className="contest-table-wrap"><table><thead><tr><th>Contest</th><th>Trạng thái</th><th>Bắt đầu</th><th>Thời lượng</th><th>Bài</th><th>Actions</th></tr></thead><tbody>{state.value.map((c) => <tr key={c.id}><td>{c.title}</td><td>{c.status}</td><td>{new Date(c.startAt).toLocaleString('vi-VN')}</td><td>{c.durationMinutes} phút</td><td>{c.problems.length}</td><td><Link to={`/teacher/contests/${c.id}/edit`}>Edit</Link> · <Link to={`/teacher/contests/${c.id}/monitor`}>Theo dõi</Link></td></tr>)}{!state.value.length && <tr><td colSpan="6">Chưa có contest.</td></tr>}</tbody></table></div>}</div>;
}
function localDate(ms) { const d = new Date(ms); return new Date(ms - d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
function ContestForm({ initial, problems, contestId }) {
  const [form, setForm] = useState(() => initial ? { ...initial, startAt: localDate(initial.startAt) } : { title:'',description:'',startAt:localDate(Date.now()+3600000),durationMinutes:120,problems:[] });
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const navigate=useNavigate();
  const { now } = useContestClock();
  const locked=initial?.status === 'published' && now >= initial.startAt;
  const available=problems.filter((p) => p.status === 'published' && p.hiddenTestCount > 0);
  const change=(key,value) => setForm((old) => ({...old,[key]:value}));
  function update(index,key,value) { change('problems',form.problems.map((p,i) => i === index ? {...p,[key]:value} : p)); }
  function move(index,offset) { const next=[...form.problems]; [next[index],next[index+offset]]=[next[index+offset],next[index]]; change('problems',next); }
  async function save(status) {
    try {
      const validated=validateContest({...form,startAt:new Date(form.startAt).getTime()},{status,publishedProblems:available});
      setBusy(true);setError('');
      await saveTeacherContest(contestId,{...validated,status}); navigate('/teacher/contests');
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  return <><h1>{contestId ? 'Sửa contest' : 'Tạo contest'}</h1>{locked && <p role="status" className="contest-warning">Contest đã bắt đầu. Cấu hình thi được khóa để giữ công bằng.</p>}<form className="contest-form" onSubmit={(e) => e.preventDefault()}><fieldset disabled={busy || locked}><legend>Cấu hình</legend><label>Tên Contest<input value={form.title} onChange={(e) => change('title',e.target.value)} /></label><label>Mô tả<textarea rows={3} value={form.description} onChange={(e) => change('description',e.target.value)} /></label><label>Thời gian bắt đầu (giờ trên thiết bị)<input type="datetime-local" value={form.startAt} onChange={(e) => change('startAt',e.target.value)} /></label><label>Thời lượng, phút<input type="number" min="1" max="1440" value={form.durationMinutes} onChange={(e) => change('durationMinutes',Number(e.target.value))} /></label></fieldset><fieldset disabled={busy || locked}><legend>Bài thi A/B/C · Điểm từng phần</legend>{form.problems.map((entry,index) => <div className="contest-builder-row" key={index}><strong>{String.fromCharCode(65+index)}</strong><label>Bài {String.fromCharCode(65+index)}<select aria-label={`Bài ${String.fromCharCode(65+index)}`} value={entry.problemId} onChange={(e) => update(index,'problemId',e.target.value)}><option value="">Chọn bài published</option>{available.map((p) => <option value={p.id} key={p.id}>{p.title}</option>)}</select></label><label>Điểm {String.fromCharCode(65+index)}<input type="number" min="1" max="10000" value={entry.points} onChange={(e) => update(index,'points',Number(e.target.value))} /></label><button disabled={index===0} aria-label={`Đưa bài ${index+1} lên`} onClick={() => move(index,-1)}>↑</button><button disabled={index===form.problems.length-1} aria-label={`Đưa bài ${index+1} xuống`} onClick={() => move(index,1)}>↓</button><button onClick={() => change('problems',form.problems.filter((_,i) => i!==index))}>Xóa</button></div>)}<button disabled={form.problems.length>=26 || !available.length} onClick={() => change('problems',[...form.problems,{problemId:'',points:100}])}>+ Thêm bài</button>{!available.length && <p>Hãy publish bài có hidden tests trước khi tạo contest.</p>}</fieldset><p>Publish sẽ khóa nội dung các bài đã chọn đến hết contest. Contest đã bắt đầu không được sửa cấu hình.</p><div className="contest-actions"><button disabled={busy || locked} onClick={() => save('draft')}>Lưu nháp</button><button disabled={busy || locked} onClick={() => save('published')}>{busy ? 'Đang lưu…' : 'Publish contest'}</button></div>{error && <p role="alert" className="err">{error}</p>}</form></>;
}
export function TeacherContestEditor() {
  const { contestId }=useParams();
  const loader=useCallback(async () => ({contest:contestId ? await loadTeacherContest(contestId) : null,problems:await listTeacherProblems()}),[contestId]);
  const state=useContestData(loader);
  if (!state.value) return <ContestError state={state} />;
  return <div className="content contest-ui"><TeacherAuthoringNav /><ContestForm key={contestId ?? 'new'} contestId={contestId} initial={state.value.contest} problems={state.value.problems} /></div>;
}
