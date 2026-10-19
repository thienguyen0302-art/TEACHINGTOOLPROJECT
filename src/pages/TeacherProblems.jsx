import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import TeacherAuthoringNav from '../components/TeacherAuthoringNav.jsx';
import Icon from '../components/Icon.jsx';
import AutoTestGenerator from '../components/AutoTestGenerator.jsx';
import { listTeacherProblems, loadTeacherProblem, saveTeacherProblem } from '../services/contestService.js';
import useContestData from '../hooks/useContestData.js';
import useContestClock from '../hooks/useContestClock.js';
import { parseProblemImport, problemTemplate, serializePublicProblem, validateProblem } from '../utils/problemAuthoring.js';
import { slugFromTitle } from '../utils/pdfProblemImport.js';
import ProblemStatement from '../components/ProblemStatement.jsx';
import { ContestError } from '../components/ContestUI.jsx';
import { importPdfContest } from '../services/pdfImportService.js';
import './ProblemBank.css';
import './Contest.css';
import './TeacherAuthoring.css';
const PdfProblemImporter = lazy(() => import('../components/PdfProblemImporter.jsx'));
const difficultyLabels = { basic: 'Cơ bản', intermediate: 'Trung bình', advanced: 'Nâng cao' };
function downloadJson(value, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function TeacherProblems() {
  const state = useContestData(listTeacherProblems);
  const location = useLocation();
  const [error, setError] = useState(''), [search, setSearch] = useState(''), [filter, setFilter] = useState('all'), [pdfOpen, setPdfOpen] = useState(!!location.state?.openPdf);
  const navigate = useNavigate();
  async function importJson(event) {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('JSON import tối đa 2 MB.');
      navigate('/teacher/problems/new', { state: { imported: parseProblemImport(await file.text()) } });
    } catch (e) { setError(e.message); } finally { event.target.value = ''; }
  }
  async function importDrafts(drafts, options) {
    const result = await importPdfContest({...options,problems:drafts});
    setPdfOpen(false); navigate(`/teacher/contests/${result.id}/edit`);
  }
  const problems = state.value ?? [];
  const visible = problems.filter(p => (filter === 'all' || p.status === filter) && `${p.title} ${p.tags.join(' ')}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  return <div className="content contest-ui author-page"><TeacherAuthoringNav />
    <header className="author-hero"><div><span className="author-kicker">KHÔNG GIAN GIÁO VIÊN</span><h1>Thư viện bài tập</h1><p>Viết đề, thêm ví dụ và đáp án để học sinh luyện tập.</p></div><div className="author-hero-actions"><Link className="contest-button contest-primary" to="/teacher/problems/new">+ Soạn bài mới</Link></div></header>
    <div className="author-summary"><div><Icon name="book" /><p><strong>{problems.length}</strong><span>Tổng bài tập</span></p></div><div><Icon name="history" /><p><strong>{problems.filter(p => p.status === 'draft').length}</strong><span>Bản nháp cần hoàn thiện</span></p></div><div><Icon name="check" /><p><strong>{problems.filter(p => p.status === 'published').length}</strong><span>Đã xuất bản</span></p></div></div>
    {error && <p className="author-error" role="alert">{error}</p>}
    <section className="author-library"><header className="author-library-heading"><div><h2>Bài tập của hệ thống</h2><p>Chọn bài để tiếp tục chỉnh sửa hoặc chuẩn bị cho contest.</p></div><label className="author-search"><Icon name="search" /><input type="search" aria-label="Tìm bài tập" placeholder="Tìm theo tên hoặc chủ đề…" value={search} onChange={e => setSearch(e.target.value)} /></label></header>
      <div className="author-library-tools"><div className="contest-filters">{[['all','Tất cả'],['draft','Bản nháp'],['published','Đã xuất bản']].map(([key,label]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><details className="author-more"><summary>Công cụ hỗ trợ</summary><button type="button" onClick={() => setPdfOpen(true)}>Nhập từ PDF bằng AI</button><label className="contest-button author-file-button">Nhập JSON<input type="file" accept=".json,application/json" aria-label="Nhập JSON" onChange={importJson} /></label><button onClick={() => downloadJson(problemTemplate, 'mau-bai-tap.json')}>Tải mẫu JSON</button></details></div>
      {!state.value ? <ContestError state={state} /> : <><div className="contest-table-wrap"><table><thead><tr><th>Bài tập</th><th>Mức độ</th><th>Trạng thái</th><th>Ví dụ / Test chấm</th><th /></tr></thead><tbody>{visible.map(p => <tr key={p.id}><td><Link className="author-problem-title" to={`/teacher/problems/${p.id}/edit`}>{p.title}</Link><small>{p.tags.join(' · ') || 'Chưa gắn chủ đề'}</small></td><td>{difficultyLabels[p.difficulty]}</td><td><span className={`author-status ${p.status}`}>{p.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</span></td><td>{p.samples.length} ví dụ · {p.hiddenTestCount} test</td><td><Link className="contest-button" to={`/teacher/problems/${p.id}/edit`}>Chỉnh sửa →</Link></td></tr>)}{!visible.length && <tr><td colSpan="5"><div className="author-empty"><Icon name="book" /><h3>{problems.length ? 'Không tìm thấy bài phù hợp' : 'Bắt đầu xây dựng kho bài của bạn'}</h3><p>{problems.length ? 'Thử đổi từ khóa hoặc bộ lọc.' : 'Bấm “Soạn bài mới”, nhập nội dung và thêm ví dụ. Bạn có thể lưu nháp bất cứ lúc nào.'}</p></div></td></tr>}</tbody></table></div>{state.error && <p role="alert" className="author-error">{state.error}</p>}</>}
    </section>
    <div className="author-next-step"><Icon name="trophy" /><div><strong>Sẵn sàng tổ chức vòng thi?</strong><p>Chọn ít nhất 4 bài đã xuất bản để tạo contest A–D.</p></div><Link to="/teacher/contests/new" className="contest-button">Tạo contest →</Link></div>
    {pdfOpen && <Suspense fallback={<p role="status">Đang mở công cụ nhập PDF…</p>}><PdfProblemImporter onClose={() => setPdfOpen(false)} onImport={importDrafts} /></Suspense>}
  </div>;
}
function TestEditor({ field, form, change, disabled, onGenerating }) {
  const sample = field === 'samples', max = sample ? 10 : 50;
  const [error,setError] = useState('');
  async function importTests(event) {
    const files=[...event.target.files]; event.target.value=''; if(!files.length)return;
    try {
      const {readTestPairs}=await import('../utils/testFileImport.js');
      const tests=await readTestPairs(files,max-form[field].length);
      change(field,[...form[field],...tests]);setError('');
    } catch(e) {setError(e.message);}
  }
  function update(index,key,value) {change(field,form[field].map((test,i)=>i===index?{...test,[key]:value}:test));}
  return <section className="author-section simple-test-section" id={sample?'simple-examples':'simple-tests'}>
    <header className="author-section-heading"><div><h2>{sample?'2. Ví dụ cho học sinh':'3. Test dùng để chấm bài'}</h2><p>{sample?'Nhập dữ liệu mẫu và kết quả đúng. Các ví dụ này sẽ hiện trong đề.':'Thêm các trường hợp khác để kiểm tra bài làm. Học sinh không nhìn thấy phần này.'}</p></div><span className="author-count">{form[field].length}/{max}</span></header>
    {!sample&&<AutoTestGenerator problem={form} disabled={disabled} onBusyChange={onGenerating} onApply={tests=>change('hiddenTests',tests)}/>}
    <fieldset disabled={disabled} className="author-flat-fieldset">
      {form[field].map((test,index)=><div className="author-test-card simple-test-card" key={index}>
        <header><strong>{sample?'Ví dụ':'Test'} {index+1}</strong><button type="button" className="author-delete" aria-label={`Xóa ${sample?'ví dụ':'test'} ${index+1}`} onClick={()=>change(field,form[field].filter((_,i)=>i!==index))}><Icon name="trash"/>Xóa</button></header>
        <div className="author-test-pair">{['input','output'].map(key=><label key={key}>{key==='input'?'Dữ liệu vào':'Kết quả đúng'}<textarea aria-label={`${sample?'Ví dụ':'Test'} ${index+1} · ${key==='input'?'Dữ liệu vào':'Kết quả đúng'}`} className="contest-source" rows={3} placeholder={key==='input'?'Ví dụ: 2 3':'Ví dụ: 5'} value={test[key]} onChange={e=>update(index,key,e.target.value)}/></label>)}</div>
        {sample&&<details className="simple-note" open={test.explanation?true:undefined}><summary>Thêm giải thích (không bắt buộc)</summary><label>Giải thích ví dụ {index+1}<textarea aria-label={`Giải thích ví dụ ${index+1}`} rows={2} value={test.explanation??''} onChange={e=>update(index,'explanation',e.target.value)}/></label></details>}
      </div>)}
      {!form[field].length&&<p className="author-muted">{sample?'Chưa có ví dụ. Thêm ít nhất một ví dụ trước khi xuất bản.':'Chưa có test chấm. Bạn có thể lưu nháp và bổ sung sau.'}</p>}
      <div className="contest-actions"><button type="button" disabled={form[field].length>=max} onClick={()=>change(field,[...form[field],{input:'',output:'',...(sample?{explanation:''}:{})}])}>+ Thêm {sample?'ví dụ':'test chấm'}</button>
        <details className="simple-file-import"><summary>Nhập nhiều test từ file</summary><p className="author-muted">Chọn các cặp 01.in / 01.out (hoặc .inp / .ans). Mỗi file tối đa 20 KB.</p><label className="contest-button author-file-button">Chọn file<input type="file" multiple accept=".in,.inp,.out,.ans,.txt" aria-label={`Nhập file ${sample?'ví dụ':'test chấm'}`} onChange={importTests}/></label></details>
      </div>
    </fieldset>{error&&<p role="alert" className="author-error">{error}</p>}
  </section>;
}
function ProblemForm({ initial, problemId, savedNotice = '' }) {
  const [form,setForm]=useState(()=>structuredClone(initial??problemTemplate));
  const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(savedNotice),[pdfOpen,setPdfOpen]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [slugEdited,setSlugEdited]=useState(!!initial?.slug);
  const [suffix]=useState(()=>crypto.randomUUID().slice(0,6));
  const [savedSignature,setSavedSignature]=useState(()=>JSON.stringify(initial??problemTemplate));
  const [status,setStatus]=useState(initial?.status??'draft');
  const navigate=useNavigate();const {now}=useContestClock();
  const locked=(initial?.lockedUntil??0)>now;
  const signature=JSON.stringify(form),dirty=signature!==savedSignature;
  const previewCurrent=preview?.signature===signature;
  useEffect(()=>{
    if(!dirty)return;
    const guard=e=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);
  },[dirty]);
  function change(key,value){setForm(old=>({...old,[key]:value}));setNotice('');setError('');}
  function titleChange(title){setForm(old=>({...old,title,...(!slugEdited?{slug:`${slugFromTitle(title)}-${suffix}`}:{})}));setNotice('');setError('');}
  function payload(){return {...form,tags:form.tags.map(t=>t.trim()).filter(Boolean),constraints:form.constraints.filter(c=>c.trim())};}
  function showError(message,id){setError(message);if(id)document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'});}
  function basicReady(){
    if(!form.title.trim()){showError('Bạn hãy nhập tên bài tập.','simple-title');return false;}
    if(!form.statement.trim()){showError('Bạn hãy nhập nội dung đề bài.','simple-statement');return false;}
    return true;
  }
  function showPreview(){
    if(!basicReady())return;
    try{setPreview({signature,problem:serializePublicProblem(validateProblem(payload()))});setError('');}
    catch(e){showError(e.message);}
  }
  async function save(nextStatus){
    if(!basicReady())return;
    if(nextStatus==='published'&&!form.samples.length){showError('Thêm ít nhất một ví dụ cho học sinh trước khi xuất bản.','simple-examples');return;}
    if(nextStatus==='published'&&!form.hiddenTests.length){showError('Thêm ít nhất một test chấm riêng trước khi xuất bản. Bạn vẫn có thể lưu nháp.','simple-tests');return;}
    try{
      const valid=validateProblem(payload(),{status:nextStatus});setBusy(true);setError('');
      const {id}=await saveTeacherProblem(problemId,{...valid,status:nextStatus});
      const message=nextStatus==='published'?'Đã xuất bản. Bạn có thể chọn bài này khi tạo contest.':'Đã lưu nháp. Bạn có thể tiếp tục sửa bất cứ lúc nào.';
      setSavedSignature(signature);setStatus(nextStatus);setNotice(message);
      if(!problemId)navigate(`/teacher/problems/${id}/edit`,{replace:true,state:{savedNotice:message}});
    }catch(e){showError(e.message);}finally{setBusy(false);}
  }
  async function importJson(event){
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try{
      if(file.size>2*1024*1024)throw new Error('JSON import tối đa 2 MB.');
      const next=parseProblemImport(await file.text());
      if(!window.confirm('Thay nội dung đang soạn bằng bài trong file JSON?'))return;
      setForm(next);setSlugEdited(true);setPreview(null);setError('');
    }catch(e){setError(e.message);}
  }
  function acceptPdf([draft]){
    if(!window.confirm('Thay nội dung, ví dụ và test chấm bằng bài vừa nhập từ PDF?'))return;
    setForm(old=>({...old,title:draft.title,slug:problemId?old.slug:`${slugFromTitle(draft.title)}-${suffix}`,statement:draft.statement,inputDescription:draft.inputDescription,outputDescription:draft.outputDescription,constraints:draft.constraints,samples:draft.samples,hiddenTests:draft.hiddenTests}));setSlugEdited(true);setPreview(null);setPdfOpen(false);
  }
  const hasStructured=!!(form.inputDescription.trim()||form.outputDescription.trim()||form.constraints.some(c=>c.trim()));
  return <div className="simple-problem-editor">
    <Link className="author-back" to="/teacher/problems" onClick={e=>{if(dirty&&!window.confirm('Bạn có thay đổi chưa lưu. Rời trình soạn thảo?'))e.preventDefault();}}>← Thư viện bài tập</Link>
    <header className="author-editor-heading"><div><span className="author-kicker">SOẠN ĐỀ</span><h1>{problemId?'Chỉnh sửa bài tập':'Soạn bài tập mới'}</h1><p className="author-muted">Nhập đề, thêm ví dụ và test chấm. Bạn có thể lưu nháp để làm tiếp.</p></div><span className={`author-status ${status}`}>{status==='published'?'Đã xuất bản':'Bản nháp'}</span></header>
    {locked&&<p role="status" className="author-notice">Bài đang thi nên được khóa đến {new Date(initial.lockedUntil).toLocaleString('vi-VN')}.</p>}
    {notice&&<p role="status" className="author-success">{notice}</p>}
    <form className="author-form" onSubmit={e=>e.preventDefault()}>
      <section className="author-section"><header className="author-section-heading"><div><h2>1. Nội dung đề</h2><p>Bạn có thể dán toàn bộ đề từ Word hoặc PDF vào ô bên dưới.</p></div></header><fieldset className="author-flat-fieldset" disabled={busy||locked||generating}>
        <label htmlFor="simple-title">Tên bài tập<input id="simple-title" maxLength={300} value={form.title} placeholder="Ví dụ: Tổng hai số" onChange={e=>titleChange(e.target.value)}/></label>
        <label htmlFor="simple-statement">Đề bài<textarea id="simple-statement" aria-label="Đề bài" rows={10} value={form.statement} placeholder={'Viết hoặc dán đề bài tại đây.\nCó thể bao gồm cả yêu cầu, dữ liệu vào, dữ liệu ra và giới hạn.'} onChange={e=>change('statement',e.target.value)}/></label>
        <details className="simple-structured" open={hasStructured?true:undefined}><summary>Tách riêng dữ liệu vào, dữ liệu ra và giới hạn (không bắt buộc)</summary><div className="author-test-pair"><label>Dữ liệu vào<textarea aria-label="Dữ liệu vào" rows={3} value={form.inputDescription} onChange={e=>change('inputDescription',e.target.value)}/></label><label>Dữ liệu ra<textarea aria-label="Dữ liệu ra" rows={3} value={form.outputDescription} onChange={e=>change('outputDescription',e.target.value)}/></label></div><label>Giới hạn · mỗi dòng một điều kiện<textarea aria-label="Giới hạn" rows={3} value={form.constraints.join('\n')} onChange={e=>change('constraints',e.target.value.split('\n'))}/></label></details>
      </fieldset></section>
      <TestEditor field="samples" form={form} change={change} disabled={busy||locked||generating}/>
      <TestEditor field="hiddenTests" form={form} change={change} disabled={busy||locked||generating} onGenerating={setGenerating}/>
      <details className="author-section simple-advanced"><summary>Tùy chọn khác</summary><fieldset disabled={busy||locked||generating} className="author-flat-fieldset"><p className="author-muted">Mặc định học sinh được dùng C++ và Python. Bạn chỉ cần chỉnh phần này khi có yêu cầu riêng.</p><div className="author-test-pair"><label>Mức độ<select value={form.difficulty} onChange={e=>change('difficulty',e.target.value)}>{Object.entries(difficultyLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Chủ đề · cách nhau bằng dấu phẩy<input value={form.tags.join(',')} onChange={e=>change('tags',e.target.value.split(','))}/></label></div>
        {['cpp','python'].map(language=><div key={language}><label className="author-check"><input type="checkbox" checked={form.allowedLanguages.includes(language)} onChange={e=>change('allowedLanguages',e.target.checked?[...form.allowedLanguages,language]:form.allowedLanguages.filter(l=>l!==language))}/>{language==='cpp'?'C++':'Python'}</label><details className="simple-note"><summary>Mã khởi đầu {language==='cpp'?'C++':'Python'}</summary><label>Mã khởi đầu<textarea className="contest-source" rows={5} value={form.starterCode[language]} onChange={e=>change('starterCode',{...form.starterCode,[language]:e.target.value})}/></label></details></div>)}
        <details className="simple-note"><summary>Công cụ hỗ trợ và nhập / xuất dữ liệu</summary><div className="contest-actions"><button type="button" onClick={()=>setPdfOpen(true)}>Nhập PDF bằng AI</button><label className="contest-button author-file-button">Nhập JSON<input type="file" accept=".json,application/json" onChange={importJson}/></label><button type="button" onClick={()=>downloadJson(form,`${form.slug||'bai-tap'}.json`)}>Tải bản sao JSON</button></div><label>Đường dẫn bài tập (tự tạo)<input value={form.slug} onChange={e=>{setSlugEdited(true);change('slug',e.target.value);}}/></label></details>
      </fieldset></details>
      {error&&<p role="alert" className="author-error">{error}</p>}
      <footer className="simple-save-bar"><span className="author-muted">{dirty?'Có thay đổi chưa lưu':status==='published'?'Bài đã xuất bản':'Bài đang soạn'}</span><div className="contest-actions"><button type="button" disabled={busy||generating} onClick={showPreview}>Xem trước</button><button type="button" disabled={busy||locked||generating} onClick={()=>save('draft')}>{busy?'Đang lưu…':'Lưu nháp'}</button><button type="button" className="contest-primary" disabled={busy||locked||generating} onClick={()=>save('published')}>Xuất bản bài tập</button></div></footer>
    </form>
    {preview&&<section className="author-section bank-ui author-preview" aria-label="Bản xem trước của học sinh"><header className="author-section-heading"><div><h2>Xem trước đề bài</h2><p>{previewCurrent?'Đây là nội dung học sinh sẽ thấy.':'Nội dung đã thay đổi. Bấm Xem trước để cập nhật.'}</p></div><button type="button" onClick={()=>setPreview(null)}>Đóng xem trước</button></header><h1>{preview.problem.title}</h1><ProblemStatement problem={preview.problem}/></section>}
    {pdfOpen&&<Suspense fallback={<p role="status">Đang mở công cụ nhập PDF…</p>}><PdfProblemImporter single onClose={()=>setPdfOpen(false)} onImport={acceptPdf}/></Suspense>}
  </div>;
}
export function TeacherProblemEditor() {
  const {problemId}=useParams(); const {state:locationState}=useLocation();
  const loader=useCallback(() => problemId?loadTeacherProblem(problemId):Promise.resolve(locationState?.imported??null),[problemId,locationState]);
  const state=useContestData(loader);
  if(state.loading || state.error)return <ContestError state={state} />;
  return <div className="content contest-ui author-page"><TeacherAuthoringNav /><ProblemForm key={problemId??'new'} problemId={problemId} initial={state.value} savedNotice={locationState?.savedNotice} /></div>;
}
