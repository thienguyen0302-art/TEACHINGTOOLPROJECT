import { authHeaders } from './authHeader.js';
import { generationContext } from '../utils/generatedTests.js';
export async function generateProblemTests(problem,{signal,maxTests=8}={}) {
  const response=await fetch('/api/teacher/problems/generate-tests',{
    method:'POST',signal,headers:{'Content-Type':'application/json',...(await authHeaders())},
    body:JSON.stringify({problem:generationContext(problem),maxTests}),
  });
  if(response.status===404)throw new Error('Backend chưa cập nhật chức năng tạo test. Hãy khởi động lại npm run dev.');
  let result;try{result=await response.json();}catch{throw new Error('Không kết nối được dịch vụ tạo test. Hãy thử lại.');}
  if(!response.ok)throw new Error(result.error||'Chưa tạo được bộ test. Hãy thử lại.');
  if(!Array.isArray(result.hiddenTests)||!result.hiddenTests.length||result.hiddenTests.some(test=>typeof test.input!=='string'||typeof test.output!=='string'))throw new Error('Dịch vụ chưa trả bộ test hợp lệ. Hãy thử lại.');
  return result;
}
