import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { listTeacherProblems, loadTeacherProblem, saveTeacherProblem } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { parseProblemImport, problemTemplate, serializePublicProblem, validateProblem } from '../utils/problemAuthoring.js';
import ProblemStatement from '../components/ProblemStatement.jsx';
import { ContestError } from '../components/ContestUI.jsx';
import './ProblemBank.css';
import './Contest.css';
function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(problemTemplate, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'problem-template.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function TeacherAuthoringNav() {
  return <nav className="contest-links" aria-label="Quản lý giáo viên"><Link to="/teacher">Tiến độ lớp</Link><Link to="/teacher/problems">Quản lý bài tập</Link><Link to="/teacher/contests">Quản lý contest</Link></nav>;
}
export default function TeacherProblems() {
  const state = useContestData(listTeacherProblems);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  async function importFile(event) {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('JSON import tối đa 2 MB.');
      const imported = parseProblemImport(await file.text());
      navigate('/teacher/problems/new', { state: { imported } });
    } catch (e) { setError(e.message); event.target.value = ''; }
  }
  return <div className="content contest-ui"><TeacherAuthoringNav /><h1>Quản lý bài tập</h1><div className="contest-actions"><Link className="contest-button" to="/teacher/problems/new">+ Tạo bài mới</Link><label className="contest-button">Import JSON<input aria-label="Import JSON" type="file" accept=".json,application/json" onChange={importFile} /></label><button onClick={downloadTemplate}>Tải mẫu JSON</button></div>{error && <p role="alert" className="err">{error}</p>}{!state.value ? <ContestError state={state} /> : <div className="contest-table-wrap"><table><thead><tr><th>Tên bài</th><th>Difficulty / Tags</th><th>Trạng thái</th><th>Samples</th><th>Hidden</th><th>Cập nhật</th><th>Sửa</th></tr></thead><tbody>{state.value.map((p) => <tr key={p.id}><td>{p.title}</td><td>{p.difficulty}<small>{p.tags.join(', ')}</small></td><td>{p.status}</td><td>{p.samples.length}</td><td>{p.hiddenTestCount}</td><td>{new Date(p.updatedAt).toLocaleString('vi-VN')}</td><td><Link to={`/teacher/problems/${p.id}/edit`}>Edit</Link></td></tr>)}{!state.value.length && <tr><td colSpan="7">Chưa có bài tập. Tạo bài đầu tiên hoặc import JSON.</td></tr>}</tbody></table></div>}</div>;
}
function ProblemForm({ initial, problemId }) {
  const [form, setForm] = useState(() => structuredClone(initial ?? problemTemplate));
  const [tagsText, setTagsText] = useState(initial?.tags.join(', ') ?? '');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { now } = useContestClock();
  const locked = (initial?.lockedUntil ?? 0) > now;
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const payload = { ...form, tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean) };
  const previewCurrent = preview?.signature === JSON.stringify(payload);
  function showPreview() {
    try { const validated = validateProblem(payload); setPreview({ signature: JSON.stringify(payload), problem: serializePublicProblem(validated) }); setError(''); }
    catch (e) { setError(e.message); }
  }
  async function save(status) {
    try {
      if (status === 'published' && !previewCurrent) throw new Error('Hãy Preview nội dung hiện tại trước khi Publish.');
      const validated = validateProblem(payload, { status });
      setBusy(true); setError('');
      const { id } = await saveTeacherProblem(problemId, { ...validated, status });
      navigate(`/teacher/problems/${id}/edit`, { replace: true });
      if (id === problemId) navigate('/teacher/problems');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function updateTest(key, index, field, value) { change(key, form[key].map((test, i) => i === index ? { ...test, [field]: value } : test)); }
  async function importFile(event) {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('JSON import tối đa 2 MB.');
      const imported = parseProblemImport(await file.text());
      setForm(imported); setTagsText(imported.tags.join(', ')); setPreview(null); setError('');
    } catch (e) { setError(e.message); }
    event.target.value = '';
  }
  return <><header className="contest-heading"><h1>{problemId ? 'Sửa bài tập' : 'Tạo bài tập'}</h1><button onClick={downloadTemplate}>Tải mẫu JSON</button></header>{locked && <p role="status" className="contest-warning">Bài đã thuộc contest published, đang khóa nội dung và hidden tests đến {new Date(initial.lockedUntil).toLocaleString('vi-VN')}.</p>}<p>Trạng thái: {initial?.status ?? 'draft'}. Import chỉ điền form, không tự lưu hoặc publish.</p><form className="contest-form" onSubmit={(e) => e.preventDefault()}><fieldset disabled={busy || locked}><legend>Thông tin</legend><label>Import JSON<input type="file" accept=".json,application/json" onChange={importFile} /></label><label>Tên bài<input value={form.title} maxLength={300} onChange={(e) => change('title', e.target.value)} /></label><label>Slug<input value={form.slug} onChange={(e) => change('slug', e.target.value)} /></label><label>Difficulty<select value={form.difficulty} onChange={(e) => change('difficulty', e.target.value)}><option value="basic">Cơ bản</option><option value="intermediate">Trung bình</option><option value="advanced">Nâng cao</option></select></label><label>Tags, cách nhau bằng dấu phẩy<input value={tagsText} onChange={(e) => setTagsText(e.target.value)} /></label></fieldset><fieldset disabled={busy || locked}><legend>Đề bài</legend>{[['statement','Statement'],['inputDescription','Input description'],['outputDescription','Output description']].map(([key,label]) => <label key={key}>{label}<textarea rows={key === 'statement' ? 6 : 3} value={form[key]} onChange={(e) => change(key,e.target.value)} /></label>)}<label>Constraints, mỗi dòng một ràng buộc<textarea rows={4} value={form.constraints.join('\n')} onChange={(e) => change('constraints',e.target.value.split('\n'))} /></label></fieldset>{[['samples','Sample tests',10],['hiddenTests','Hidden tests',50]].map(([key,label,max]) => <fieldset disabled={busy || locked} key={key}><legend>{label} ({form[key].length}/{max})</legend>{key === 'hiddenTests' && <p className="contest-warning">Chỉ giáo viên và hệ thống chấm bài có thể xem.</p>}{form[key].map((test,index) => <div className="contest-test-editor" key={index}><h3>{key === 'samples' ? 'Sample' : 'Hidden'} {index+1}</h3>{['input','output',...(key === 'samples' ? ['explanation'] : [])].map((field) => <label key={field}>{`${key === 'samples' ? 'Sample' : 'Hidden'} ${index+1} ${field}`}<textarea rows={3} value={test[field] ?? ''} onChange={(e) => updateTest(key,index,field,e.target.value)} /></label>)}<button onClick={() => change(key,form[key].filter((_,i) => i !== index))}>Xóa test {index+1}</button></div>)}<button disabled={form[key].length >= max} onClick={() => change(key,[...form[key], { input:'',output:'',...(key === 'samples' ? {explanation:''} : {}) }])}>+ Thêm {key === 'samples' ? 'sample' : 'hidden test'}</button></fieldset>)}<fieldset disabled={busy || locked}><legend>Ngôn ngữ và starter code</legend>{['cpp','python'].map((language) => <div key={language}><label className="contest-checkbox"><input type="checkbox" checked={form.allowedLanguages.includes(language)} onChange={(e) => change('allowedLanguages',e.target.checked ? [...form.allowedLanguages,language] : form.allowedLanguages.filter((l) => l !== language))} />{language === 'cpp' ? 'C++' : 'Python'}</label><label>Starter code {language}<textarea className="contest-source" rows={6} value={form.starterCode[language]} onChange={(e) => change('starterCode',{...form.starterCode,[language]:e.target.value})} /></label></div>)}</fieldset><div className="contest-actions"><button disabled={busy} onClick={showPreview}>Preview</button><button disabled={busy || locked} onClick={() => save('draft')}>Lưu nháp</button><button disabled={busy || locked || !previewCurrent} onClick={() => save('published')}>{busy ? 'Đang lưu…' : 'Publish problem'}</button></div>{error && <p role="alert" className="err">{error}</p>}</form>{preview && <section aria-label="Student Preview" className="contest-card bank-ui"><h2>Student Preview</h2><h1>{preview.problem.title}</h1><ProblemStatement problem={preview.problem} />{preview.problem.allowedLanguages.map((l) => <div key={l}><h3>Starter code {l}</h3><pre><code>{preview.problem.starterCode[l]}</code></pre></div>)}</section>}</>;
}
export function TeacherProblemEditor() {
  const { problemId } = useParams();
  const { state: locationState } = useLocation();
  const loader = useCallback(() => problemId ? loadTeacherProblem(problemId) : Promise.resolve(locationState?.imported ?? null), [problemId, locationState]);
  const state = useContestData(loader);
  if (state.loading || state.error) return <ContestError state={state} />;
  return <div className="content contest-ui"><TeacherAuthoringNav /><ProblemForm key={problemId ?? 'new'} problemId={problemId} initial={state.value} /></div>;
}
