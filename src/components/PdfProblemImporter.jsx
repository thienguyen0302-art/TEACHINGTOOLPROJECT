import { useEffect, useRef, useState } from 'react';
import { openPdf, analyzePdfWithAI, preparePdfTests } from '../services/pdfImportService.js';
import { parsePageSelection } from '../utils/pdfProblemImport.js';
import Icon from './Icon.jsx';
function PdfPage({ pdf, number }) {
  const ref = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false, task;
    async function draw() {
      try {
        const page = await pdf.getPage(number);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.5, 900 / base.width) });
        const canvas = ref.current; canvas.width = viewport.width; canvas.height = viewport.height;
        task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
        await task.promise;
      } catch (e) { if (!cancelled && e.name !== 'RenderingCancelledException') setError('Không hiển thị được trang này. Bạn vẫn có thể đọc nội dung PDF.'); }
    }
    draw(); return () => { cancelled = true; task?.cancel(); };
  }, [pdf, number]);
  return <div className="author-pdf-page">{error && <p role="alert">{error}</p>}<canvas ref={ref} aria-label={`Trang PDF ${number}`} /></div>;
}
const contentFields = [['statement','Đề bài',8],['inputDescription','Dữ liệu vào',3],['outputDescription','Dữ liệu ra',3]];
function AiProblemReview({problem,index,chosen,onChoose,onChange,onPrepare,busy,single}) {
  return <article className="author-ai-problem"><header><label className="author-check"><input type={single?'radio':'checkbox'} name="pdf-problem" checked={chosen} disabled={busy} onChange={onChoose}/><strong>Bài {String.fromCharCode(65+index)}</strong></label><span className="author-muted">Trang {problem.sourcePages.join(', ')} · {problem.samples.length} ví dụ · {problem.hiddenTests.length} test</span></header>
    <details open={chosen}><summary>{problem.title}</summary><div className="author-ai-problem-body"><div className="author-test-pair"><label>Tên bài {index+1}<input value={problem.title} disabled={busy} onChange={e=>onChange('title',e.target.value)}/></label><label>Điểm bài {index+1}<input type="number" min="1" max="10000" value={problem.points} disabled={busy} onChange={e=>onChange('points',Number(e.target.value))}/></label></div>
      {problem.warnings.length>0&&<div className="author-notice"><strong>AI cần bạn đối chiếu:</strong><ul>{problem.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
      {contentFields.map(([field,label,rows])=><label key={field}>{label} · bài {index+1}<textarea aria-label={`${label} · bài ${index+1}`} rows={rows} value={problem[field]} disabled={busy} onChange={e=>onChange(field,e.target.value)}/></label>)}
      <label>Ràng buộc · bài {index+1}<textarea aria-label={`Ràng buộc · bài ${index+1}`} rows={3} value={problem.constraints.join('\n')} disabled={busy} onChange={e=>onChange('constraints',e.target.value.split('\n'))}/></label>
      <h3>Ví dụ đọc từ PDF</h3>{problem.samples.map((sample,n)=><div className="author-test-card" key={n}><header><strong>Ví dụ {n+1}</strong><button type="button" disabled={busy} onClick={()=>onChange('samples',problem.samples.filter((_,j)=>j!==n))}>Xóa ví dụ</button></header><div className="author-test-pair">{['input','output'].map(field=><label key={field}>{field==='input'?'Input':'Output'} · ví dụ {n+1}<textarea aria-label={`Bài ${index+1} ví dụ ${n+1} ${field}`} rows={3} value={sample[field]} disabled={busy} onChange={e=>onChange('samples',problem.samples.map((s,j)=>j===n?{...s,[field]:e.target.value}:s))}/></label>)}</div></div>)}
      {!problem.samples.length&&<p className="author-notice">PDF chưa có ví dụ đọc chắc chắn. Bổ sung ví dụ đúng trước khi tạo bộ chấm.</p>}<button type="button" disabled={busy||problem.samples.length>=10} onClick={()=>onChange('samples',[...problem.samples,{input:'',output:'',explanation:''}])}>+ Thêm ví dụ</button>
      <div className="author-ai-test-heading"><div><h3>Bộ chấm riêng</h3><p className="author-muted">AI viết hai lời giải để chạy đối chiếu. Kết quả test được tính bằng máy chấm.</p></div><button type="button" disabled={busy||!problem.samples.length} onClick={onPrepare}>{problem.hiddenTests.length?'Tạo lại bộ chấm':'AI tạo & kiểm tra bộ chấm'}</button></div>
      {problem.verification&&<p className="author-success">Đã chạy {problem.verification.referenceImplementations} lời giải, khớp {problem.verification.samplesChecked} ví dụ gốc và {problem.verification.testsChecked} test mới. Hãy kiểm tra thêm độ phủ test trước khi đăng.</p>}
      {problem.hiddenTests.length>0&&<details><summary>Xem / sửa {problem.hiddenTests.length} test chấm (chỉ giáo viên)</summary>{problem.hiddenTests.map((test,n)=><div className="author-test-pair" key={n}>{['input','output'].map(field=><label key={field}>Test {n+1} · {field}<textarea aria-label={`Bài ${index+1} test ${n+1} ${field}`} rows={3} value={test[field]} disabled={busy} onChange={e=>onChange('hiddenTests',problem.hiddenTests.map((t,j)=>j===n?{...t,[field]:e.target.value}:t))}/></label>)}</div>)}</details>}
    </div></details></article>;
}
export default function PdfProblemImporter({onClose,onImport,single=false}) {
  const [pdf,setPdf]=useState(null),[filename,setFilename]=useState(''),[selection,setSelection]=useState('1'),[page,setPage]=useState(1);
  const [stage,setStage]=useState(0),[problems,setProblems]=useState([]),[selected,setSelected]=useState([]),[contest,setContest]=useState(null),[warnings,setWarnings]=useState([]);
  const [busy,setBusy]=useState(false),[working,setWorking]=useState(false),[progress,setProgress]=useState(''),[error,setError]=useState(''),[ack,setAck]=useState(false),[publishProblems,setPublishProblems]=useState(false);
  const dialog=useRef(null),fileInput=useRef(null),request=useRef(null),documentRef=useRef(null),sourceFile=useRef(null),active=useRef(true),importId=useRef(crypto.randomUUID());
  useEffect(()=>{
    active.current=true;const previous=document.activeElement;dialog.current?.focus();const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{active.current=false;request.current?.abort();documentRef.current?.loadingTask.destroy();document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  function keyboard(event){
    if(event.key==='Escape'&&!busy)onClose();if(event.key!=='Tab')return;
    const items=[...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),summary')];const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
  async function load(file){
    if(!file||busy)return;setBusy(true);setError('');setProgress('Đang mở PDF…');
    try{const loaded=await openPdf(file);if(!active.current){loaded.loadingTask.destroy();return;}await documentRef.current?.loadingTask.destroy();documentRef.current=loaded;sourceFile.current=file;setPdf(loaded);setFilename(file.name);setPage(1);setSelection(`1${loaded.numPages>1?`-${Math.min(loaded.numPages,4)}`:''}`);setStage(1);setProblems([]);setAck(false);}
    catch(e){if(active.current)setError(e.message);}finally{if(active.current){setBusy(false);setProgress('');}}
  }
  async function task(label,action){
    if(request.current)return;const controller=new AbortController();request.current=controller;setBusy(true);setWorking(true);setError('');setProgress(label);
    try{await action(controller.signal);}catch(e){if(active.current&&!controller.signal.aborted)setError(e.message||'Không xử lý được đề PDF. Hãy thử lại.');}
    finally{request.current=null;if(active.current){setBusy(false);setWorking(false);setProgress('');}}
  }
  function analyze(){
    try{parsePageSelection(selection,pdf.numPages);}catch(e){setError(e.message);return;}
    task('Peanut AI đang đọc trực tiếp PDF, nhận diện bài và kiểm tra bảng ví dụ…',async signal=>{
      const result=await analyzePdfWithAI(sourceFile.current,selection,signal);if(!active.current||signal.aborted)return;
      importId.current=crypto.randomUUID();setProblems(result.problems);setSelected(single?[0]:result.problems.map((_,i)=>i));setContest({title:result.title,description:result.description,durationMinutes:result.durationMinutes,startAt:Date.now()+3600000});setWarnings(result.warnings);setAck(false);setPublishProblems(false);setStage(2);
    });
  }
  function edit(index,key,value){
    setProblems(old=>old.map((p,i)=>i!==index?p:{...p,[key]:value,...(['title','statement','inputDescription','outputDescription','constraints','samples'].includes(key)?{hiddenTests:[],verification:null}:key==='hiddenTests'?{verification:null}:{})}));setAck(false);setPublishProblems(false);
  }
  async function prepare(indices){
    await task('AI đang chuẩn bị bộ chấm…',async signal=>{
      for(const [n,index]of indices.entries()){
        if(signal.aborted)return;setProgress(`AI tạo và chạy đối chiếu bộ chấm · bài ${String.fromCharCode(65+index)} (${n+1}/${indices.length})…`);
        const result=await preparePdfTests(problems[index],signal);if(!active.current||signal.aborted)return;
        setProblems(old=>old.map((p,i)=>i===index?{...p,hiddenTests:result.hiddenTests,verification:result.verification,warnings:[...p.warnings,...result.warnings]}:p));
      }setAck(false);
    });
  }
  async function finish(){
    setBusy(true);setError('');
    try{await onImport(selected.map(i=>problems[i]),{contest,importId:importId.current,reviewed:ack,publishProblems:!single&&publishProblems});}
    catch(e){if(active.current)setError(e.message);}finally{if(active.current)setBusy(false);}
  }
  const ready=selected.length>0&&selected.every(i=>problems[i].samples.length&&problems[i].hiddenTests.length);
  return <div className="author-modal-backdrop"><section className="author-import-dialog author-ai-dialog" role="dialog" aria-modal="true" aria-labelledby="pdf-import-title" ref={dialog} tabIndex={-1} onKeyDown={keyboard}>
    <header className="author-modal-header"><div><span className="author-kicker">PEANUT AI · TRỢ LÝ BIÊN SOẠN</span><h2 id="pdf-import-title">Từ PDF đến contest</h2><p>AI đọc đề gốc, tách bài và hỗ trợ chuẩn bị bộ chấm. Bạn duyệt trước khi đăng.</p></div><button type="button" disabled={busy&&!working} onClick={onClose} aria-label="Đóng nhập PDF"><Icon name="x"/></button></header>
    <ol className="author-import-steps">{['Chọn tài liệu','AI đọc đề','Duyệt & tạo contest'].map((label,i)=><li key={label} aria-current={stage===i?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
    <div className="author-modal-body">
      {stage===0&&<><button type="button" className="author-dropzone" disabled={busy} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();load(e.dataTransfer.files[0]);}} onClick={()=>fileInput.current.click()}><Icon name="book"/><strong>Chọn hoặc thả file PDF đề thi</strong><span>Đọc được PDF văn bản và bản scan · Tối đa 20 MB</span></button><p className="author-muted">Các trang bạn chọn sẽ được gửi tới Peanut AI (Gemini) để phân tích. Không cần sao chép hay tách chữ thủ công.</p></>}
      <input ref={fileInput} className="author-visually-hidden" aria-label="Chọn file PDF" type="file" accept=".pdf,application/pdf" onChange={e=>{load(e.target.files[0]);e.target.value='';}}/>
      {pdf&&<div className="author-source-bar"><span><Icon name="book"/>{filename} · {pdf.numPages} trang</span><button type="button" disabled={busy} onClick={()=>fileInput.current.click()}>Đổi file</button></div>}
      {stage===1&&<div className="author-import-layout"><div><h3>Chọn trang để AI đọc</h3><label>Trang chứa đề bài<input disabled={busy} value={selection} onChange={e=>setSelection(e.target.value)} placeholder="Ví dụ: 1-3, 5"/></label><p className="author-muted">Chọn tối đa 30 trang. AI nhìn trực tiếp bố cục, công thức và bảng ví dụ. Chỉ các trang được chọn được gửi sang Gemini.</p><label>Xem trang<input type="number" min="1" max={pdf.numPages} value={page} disabled={busy} onChange={e=>setPage(Math.max(1,Math.min(pdf.numPages,parseInt(e.target.value,10)||1)))}/></label><button type="button" className="contest-primary" disabled={busy} onClick={analyze}>AI phân tích đề →</button></div><PdfPage pdf={pdf} number={page}/></div>}
      {stage===2&&<>
        <div className="author-ai-summary"><div><span className="author-kicker">ĐÃ NHẬN DIỆN {problems.length} BÀI TẬP</span><h3>Kiểm tra nội dung, chuẩn bị bộ chấm</h3><p className="author-muted">Sửa trực tiếp từng bài bên dưới. Thay đổi đề hoặc ví dụ sẽ xóa bộ test AI cũ để tránh chấm sai.</p></div><button type="button" disabled={busy||!selected.length||selected.some(i=>!problems[i].samples.length)} onClick={()=>prepare(selected)}>AI chuẩn bị bộ chấm cho {selected.length} bài</button></div>
        {warnings.length>0&&<div className="author-notice"><ul>{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
        {!single&&<div className="author-test-pair"><label>Tên contest<input value={contest.title} disabled={busy} onChange={e=>setContest(old=>({...old,title:e.target.value}))}/></label><label>Thời lượng (phút)<input type="number" min="1" max="1440" disabled={busy} value={contest.durationMinutes} onChange={e=>setContest(old=>({...old,durationMinutes:Number(e.target.value)}))}/></label></div>}
        <details className="author-ai-source"><summary>Đối chiếu PDF gốc</summary><label>Xem trang nguồn<input type="number" min="1" max={pdf.numPages} value={page} onChange={e=>setPage(Math.max(1,Math.min(pdf.numPages,parseInt(e.target.value,10)||1)))}/></label><PdfPage pdf={pdf} number={page}/></details>
        <div className="author-import-candidates">{problems.map((problem,i)=><AiProblemReview key={i} problem={problem} index={i} single={single} chosen={selected.includes(i)} onChoose={()=>{setSelected(single?[i]:selected.includes(i)?selected.filter(n=>n!==i):[...selected,i].sort((a,b)=>a-b));setAck(false);setPublishProblems(false);}} onChange={(key,value)=>edit(i,key,value)} onPrepare={()=>prepare([i])} busy={busy}/>)}</div>
        {!single&&selected.length<4&&<p className="author-notice">Nguồn có {selected.length} bài được chọn. Bạn có thể tạo contest nháp và bổ sung bài sau; cần ít nhất 4 bài để xuất bản.</p>}
        <div className="author-ai-footer"><label className="author-check"><input type="checkbox" checked={ack} disabled={busy} onChange={e=>{setAck(e.target.checked);if(!e.target.checked)setPublishProblems(false);}}/>Tôi đã đối chiếu đề, công thức, ví dụ và các test chấm được chọn.</label>
        {!single&&<label className="author-check"><input type="checkbox" checked={publishProblems} disabled={busy||!ack||!ready} onChange={e=>setPublishProblems(e.target.checked)}/>Xuất bản các bài đã kiểm tra để contest sẵn sàng chấm bài.</label>}
        <p className="author-muted">{single?'Bài được đưa vào trình soạn thảo để tiếp tục chỉnh sửa.':'Contest được lưu nháp để bạn đặt lịch và xuất bản. Các bài chưa đủ ví dụ/test sẽ được lưu nháp.'}</p>
        <div className="contest-actions"><button type="button" disabled={busy} onClick={()=>setStage(1)}>← Chọn lại trang</button><button type="button" className="contest-primary" disabled={busy||!ack||!selected.length||(!single&&!contest.title.trim())} onClick={finish}>{busy&&!working?'Đang lưu…':single?'Đưa vào trình soạn thảo':`Tạo contest với ${selected.length} bài`}</button></div></div>
      </>}
      {busy&&<p role="status" className="author-progress">{progress||'Đang lưu contest…'}</p>}{working&&<button type="button" onClick={()=>request.current?.abort()}>Dừng xử lý AI</button>}{error&&<p className="author-error" role="alert">{error}</p>}
    </div>
  </section></div>;
}
