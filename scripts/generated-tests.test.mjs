import test from 'node:test';
import assert from 'node:assert/strict';
import {generationContext,generationSignature,mergeGeneratedTests} from '../src/utils/generatedTests.js';
import {problemTemplate} from '../src/utils/problemAuthoring.js';
test('generation context strips existing private tests and teacher metadata',()=>{
 const context=generationContext({...problemTemplate,hiddenTests:[{input:'PRIVATE_INPUT',output:'PRIVATE_OUTPUT'}],createdBy:'PRIVATE_TEACHER',createdAt:123,solution:'PRIVATE_SOLUTION'});
 const raw=JSON.stringify(context);for(const word of ['PRIVATE','hiddenTests','createdBy','createdAt','solution'])assert.ok(!raw.includes(word));
});
test('test generation becomes stale after changing source content or sample outputs',()=>{
 const problem={...problemTemplate,title:'Sum',statement:'a+b'};
 assert.notEqual(generationSignature(problem),generationSignature({...problem,statement:'a-b'}));
 assert.notEqual(generationSignature(problem),generationSignature({...problem,samples:[{input:'2 3',output:'5'}]}));
 assert.equal(generationSignature(problem),generationSignature({...problem,hiddenTests:[{input:'4 5',output:'9'}]}));
});
test('generated tests append without replacing manual tests and skip identical inputs/answers',()=>{
 const existing=[{input:'9 8',output:'17'}],samples=[{input:'2 3',output:'5'}];
 const result=mergeGeneratedTests(existing,[{input:'9 8',output:'17\n'},{input:'2 3',output:'5'},{input:'0 0',output:'0'}],samples);
 assert.equal(result.added,1);assert.deepEqual(result.tests,[...existing,{input:'0 0',output:'0'}]);assert.deepEqual(existing,[{input:'9 8',output:'17'}]);
});
test('conflicting answers and total overflow fail without changing existing tests',()=>{
 const existing=[{input:'2 3',output:'5'}];assert.throws(()=>mergeGeneratedTests(existing,[{input:'2 3',output:'6'}]),/khác kết quả/);
 const full=Array.from({length:50},(_,i)=>({input:String(i),output:String(i)}));assert.throws(()=>mergeGeneratedTests(full,[{input:'new',output:'0'}]),/50/);assert.equal(full.length,50);
});
