import {useEffect,useRef,useState} from 'react';
import {generateProblemTests} from '../services/testGenerationService.js';
import {generationSignature,mergeGeneratedTests} from '../utils/generatedTests.js';
import Icon from './Icon.jsx';
export default function AutoTestGenerator({problem,disabled,onApply,onBusyChange}) {
  const [working,setWorking]=useState(false),[result,setResult]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const request=useRef(null),mounted=useRef(true);
  const signature=generationSignature(problem);
  const current=result?.signature===signature;
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current?.abort();};},[]);
  async function generate(){
    if(request.current||disabled)return;
    setError('');setNotice('');
    if(!problem.title.trim()||!problem.statement.trim()){setError('Nhập tên và nội dung đề trước khi tạo test.');return;}
    if(!problem.samples.length||problem.samples.every(sample=>!sample.input.trim()&&!sample.output.trim())){setError('Thêm ít nhất một ví dụ có dữ liệu và kết quả đúng để kiểm tra test tự động.');return;}
    if(problem.hiddenTests.length>=50){setError('Bài đã có 50 test. Hãy xóa bớt trước khi tạo thêm.');return;}
    const controller=new AbortController();request.current=controller;setWorking(true);onBusyChange(true);setResult(null);
    try{
      const generated=await generateProblemTests(problem,{signal:controller.signal,maxTests:Math.min(8,50-problem.hiddenTests.length)});
      if(mounted.current&&!controller.signal.aborted)setResult({...generated,signature});
    }catch(e){if(mounted.current&&!controller.signal.aborted)setError(e.message);}
    finally{request.current=null;if(mounted.current){setWorking(false);onBusyChange(false);}}
  }
  function apply(){
    try{
      const merged=mergeGeneratedTests(problem.hiddenTests,result.hiddenTests,problem.samples);
      if(!merged.added){setNotice('Các test này đã có trong bài hoặc ví dụ. Không thêm test trùng.');setResult(null);return;}
      onApply(merged.tests);setResult(null);setError('');setNotice(`Đã thêm ${merged.added} test vào bài. Bấm Lưu nháp hoặc Xuất bản để lưu.`);
    }catch(e){setError(e.message);}
  }
  return <div className="auto-test-generator">
    <div className="auto-test-generator__heading"><div><strong>Tạo test tự động</strong><p>Dùng AI tạo thêm các trường hợp kiểm tra từ đề và ví dụ bạn đã nhập.</p></div>{working?<button type="button" onClick={()=>request.current?.abort()}>Dừng tạo test</button>:<button type="button" disabled={disabled||problem.hiddenTests.length>=50} onClick={generate}><Icon name="code"/>Tạo test tự động</button>}</div>
    {working&&<p role="status" className="author-progress">Đang tạo test và chạy đối chiếu trên máy chấm. Có thể mất vài phút…</p>}
    {error&&<p role="alert" className="author-error">{error}</p>}{notice&&<p role="status" className="author-success">{notice}</p>}
    {result&&<div className="auto-test-result"><p><strong>Đã tạo {result.hiddenTests.length} test.</strong> {result.verification?.referenceImplementations===2?'Hai lời giải đã được chạy đối chiếu với ví dụ và test mới.':''}</p><p className="author-muted">Kiểm tra lại các trường hợp trước khi thêm vào bài. Các test đang có được giữ lại.</p>
      {!!result.warnings?.length&&<ul className="author-notice">{result.warnings.map((message,i)=><li key={i}>{message}</li>)}</ul>}
      {!current&&<p role="status" className="author-notice">Đề hoặc ví dụ đã thay đổi. Hãy tạo lại test theo nội dung mới.</p>}
      <details><summary>Xem {result.hiddenTests.length} test vừa tạo</summary>{result.hiddenTests.map((test,index)=><div className="author-test-pair" key={index}><div><small>Test {index+1} · Dữ liệu vào</small><pre>{test.input}</pre></div><div><small>Kết quả đúng</small><pre>{test.output}</pre></div></div>)}</details>
      <div className="contest-actions"><button type="button" className="contest-primary" disabled={disabled||!current} onClick={apply}>Thêm test vào bài</button><button type="button" disabled={working} onClick={()=>setResult(null)}>Bỏ kết quả</button></div>
    </div>}
  </div>;
}
