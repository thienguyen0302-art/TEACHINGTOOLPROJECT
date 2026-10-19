// Only statement fields needed by the generator leave the editor. Existing
// private tests, teacher IDs and timestamps are never included in this context.
export function generationContext(problem) {
  const fields=['title','statement','inputDescription','outputDescription','constraints','samples','difficulty','tags','allowedLanguages','starterCode'];
  return Object.fromEntries(fields.map(key=>[key,problem[key]]));
}
export function generationSignature(problem) {
  return JSON.stringify([problem.title,problem.statement,problem.inputDescription,problem.outputDescription,problem.constraints,problem.samples]);
}
const inputKey=text=>text.replace(/\r\n/g,'\n');
const outputKey=text=>text.trim().split(/\s+/).filter(Boolean).join(' ');
export function mergeGeneratedTests(existing,generated,samples=[]) {
  const result=existing.map(test=>({...test}));
  const seen=new Map([...samples,...existing].map(test=>[inputKey(test.input),outputKey(test.output)]));
  for(const test of generated){
    const key=inputKey(test.input),expected=outputKey(test.output);
    if(seen.has(key)){
      if(seen.get(key)!==expected)throw new Error('Có test trùng dữ liệu vào nhưng khác kết quả đúng. Hãy đối chiếu đề, ví dụ và test đang có.');
      continue;
    }
    seen.set(key,expected);result.push({input:test.input,output:test.output});
  }
  if(result.length>50)throw new Error('Tối đa 50 test chấm. Hãy xóa bớt test trước khi thêm.');
  return {tests:result,added:result.length-existing.length};
}
