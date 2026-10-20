import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { authoredProblem } from '../../server/contestTestSupport.js';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const width of [1440, 390]) {
    for (const bank of ['/practice', '/practice-bank']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const { hiddenTests, ...first } = authoredProblem({ id: 'student-first', title: 'Bài giáo viên đăng đầu tiên', practicePublished: true });
      assert.ok(hiddenTests.length);
      const second = { ...first, id: 'student-new', title: 'Bài vừa đăng khi học sinh đang xem kho' };
      let items = [first];
      let releaseInitial;
      const initialResponse = new Promise(resolve => { releaseInitial = resolve; });
      await page.route('**/api/practice', async route => {
        await initialResponse;
        await route.fulfill({ json: items });
      });
      await page.clock.install();
      await page.goto(`${server.resolvedUrls.local[0]}scripts/student-bank-browser/fixture.html?bank=${encodeURIComponent(bank)}`);
      await page.getByText('Đang tải bài tập giáo viên…', { exact: true }).waitFor();
      releaseInitial();
      // No click, filter change, or problem navigation before the uploaded row appears.
      await page.getByRole('link', { name: first.title, exact: true }).waitFor();
      await page.getByText('Đang tải bài tập giáo viên…', { exact: true }).waitFor({ state: 'detached' });
      assert.equal(await page.getByRole('link', { name: first.title, exact: true }).getAttribute('href'), `/practice/problem/${first.id}`);

      items = [first, second];
      await page.clock.fastForward(15001);
      await page.getByRole('link', { name: second.title, exact: true }).waitFor();
      // Returning from another tab updates immediately, without waiting for the next poll.
      items = [second];
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.getByRole('link', { name: first.title, exact: true }).waitFor({ state: 'detached' });
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `/tmp/student-bank-${bank.slice(1)}-${width}.png`, fullPage: true });
      await page.close();
      console.log(`PASS ${bank} ${width}px: initial upload, new publication while idle, return to tab; no problem click`);
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
