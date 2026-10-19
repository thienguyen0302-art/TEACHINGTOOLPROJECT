import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePageSelection, slugFromTitle } from '../src/utils/pdfProblemImport.js';
import { readTestPairs } from '../src/utils/testFileImport.js';
test('page ranges deduplicate, preserve source order and reject invalid or excessive ranges',()=>{
  assert.deepEqual(parsePageSelection('3, 1-3, 5',7),[1,2,3,5]);
  for(const value of ['', '0','4-2','1-8','1,x','2.5','-1'])assert.throws(()=>parsePageSelection(value,7));
  assert.throws(()=>parsePageSelection('1-31',40));
  assert.throws(()=>parsePageSelection(Array.from({length:31},(_,i)=>i+1).join(','),40));
});
test('Vietnamese titles become editable URL slugs',()=>{assert.equal(slugFromTitle('Đề thi: Số nguyên!'),'de-thi-so-nguyen');});
const file=(name,text,size=text.length)=>({name,size,text:async()=>text});
test('test file pairs match by basename, sort naturally and preserve empty output',async()=>{
  const pairs=await readTestPairs([file('10.out',''),file('2.inp','2\n'),file('10.in','10'),file('2.ans','4\n')],10);
  assert.deepEqual(pairs,[{input:'2\n',output:'4\n'},{input:'10',output:''}]);
});
test('test import rejects incomplete, duplicate, oversized and excessive pairs without partial results',async()=>{
  for(const files of [[file('1.in','a')],[file('1.in','a'),file('1.inp','b')],[file('1.in','a',21000),file('1.out','b')],[file('wrong.txt','a')]])await assert.rejects(readTestPairs(files,10));
  await assert.rejects(readTestPairs([file('1.in','a'),file('1.out','b')],0));
});
