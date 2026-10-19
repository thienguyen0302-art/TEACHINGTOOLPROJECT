import { PDF_MAX_BYTES } from '../utils/pdfProblemImport.js';
import { authHeaders } from './authHeader.js';
export async function openPdf(file) {
  if (file.size > PDF_MAX_BYTES) throw new Error('PDF tối đa 20 MB. Hãy tách file lớn thành các phần nhỏ.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes('%PDF-')) throw new Error('File không phải PDF hợp lệ.');
  const pdfjs = await import('pdfjs-dist');
  const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false, stopAtErrors: false });
  task.onPassword = () => { task.destroy(); };
  try { return await task.promise; }
  catch { throw new Error('Không đọc được PDF. File có thể bị hỏng hoặc có mật khẩu; hãy dùng bản PDF không khóa.'); }
}
async function request(action, body, signal) {
  const response = await fetch(`/api/teacher/pdf/${action}`, { method:'POST', signal, headers:{'Content-Type':'application/json',...(await authHeaders())},body:JSON.stringify(body) });
  if(response.status===404)throw new Error('Backend đang chạy chưa có API đọc PDF bằng AI. Hãy cập nhật backend cùng phiên bản với giao diện và khởi động lại npm run dev (hoặc triển khai lại backend nếu dùng web online).');
  let data;try{data=await response.json();}catch{throw new Error('Không kết nối được dịch vụ AI nhập PDF. Kiểm tra backend và thử lại.');}
  if(!response.ok)throw new Error(data.error||'Không xử lý được đề PDF.');
  return data;
}
export async function analyzePdfWithAI(file, pages, signal) {
  const base64=await new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Không đọc được file PDF.'));reader.onabort=()=>reject(new DOMException('Đã hủy.','AbortError'));reader.readAsDataURL(file);
  });
  signal?.throwIfAborted();return request('analyze',{pdfBase64:base64,pages},signal);
}
export const preparePdfTests = (problem,signal) => request('prepare-tests',{problem},signal);
export const importPdfContest = body => request('import',body);
