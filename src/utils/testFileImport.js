export async function readTestPairs(files, remaining) {
  if (files.length > remaining * 2) throw new Error(`Chỉ còn chỗ cho ${remaining} test. Mỗi test cần một file vào và một file ra.`);
  const pairs = new Map();
  for (const file of files) {
    const match = file.name.match(/^(.+)\.(in|inp|out|ans)(?:\.txt)?$/i);
    if (!match) throw new Error(`Tên file ${file.name} chưa đúng. Dùng 01.in và 01.out hoặc 01.inp và 01.ans.`);
    if (file.size > 20 * 1024) throw new Error(`File ${file.name} vượt 20 KB.`);
    const key = match[1], field = /^(in|inp)$/i.test(match[2]) ? 'input' : 'output';
    const pair = pairs.get(key) ?? {};
    if (pair[field] !== undefined) throw new Error(`Trùng file ${field === 'input' ? 'vào' : 'ra'} của test ${key}.`);
    pair[field] = await file.text(); pairs.set(key,pair);
  }
  const result = [];
  for (const [name,pair] of [...pairs].sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}))) {
    if (pair.input === undefined || pair.output === undefined) throw new Error(`Test ${name} thiếu file ${pair.input === undefined ? 'dữ liệu vào' : 'kết quả đúng'}.`);
    result.push(pair);
  }
  return result;
}
