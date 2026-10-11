export async function judgeCode({ slug, source, language, mode, stdin, signal }) {
  const response = await fetch('/api/judge', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, source, language, mode, stdin }), signal,
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Không nhận được JSON từ backend chấm bài. Chạy npm run dev để mở cả giao diện và máy chấm; nếu dùng website đã deploy, cần cấu hình proxy /api/judge trên server.'); }
  if (!response.ok) throw new Error(data.error || 'Không chấm được bài. Hãy thử lại.');
  return data;
}
