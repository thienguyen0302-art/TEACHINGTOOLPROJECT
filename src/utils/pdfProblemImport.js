export const PDF_MAX_BYTES = 20 * 1024 * 1024;
export const PDF_MAX_PAGES = 30;
export function slugFromTitle(title) {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 85) || 'bai-tap';
}
export function parsePageSelection(value, total) {
  if (!Number.isInteger(total) || total < 1) throw new Error('PDF không có trang hợp lệ.');
  if (!value.trim()) throw new Error('Chọn trang chứa đề bài, ví dụ 1-3, 5.');
  const pages = new Set();
  for (const part of value.split(',')) {
    const match = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Số trang không hợp lệ. Ví dụ: 1-3, 5.');
    const from = Number(match[1]), to = Number(match[2] ?? match[1]);
    if (from < 1 || to > total || from > to || to - from >= PDF_MAX_PAGES) throw new Error(`Chọn tối đa ${PDF_MAX_PAGES} trang, trong khoảng 1–${total}.`);
    for (let page = from; page <= to; page++) pages.add(page);
  }
  if (pages.size > PDF_MAX_PAGES) throw new Error(`Mỗi lần nhập tối đa ${PDF_MAX_PAGES} trang.`);
  return [...pages].sort((a, b) => a - b);
}
