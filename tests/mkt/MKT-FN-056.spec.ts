import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-056',
  name: '23:59:50 에는 타임세일 카운트다운이 「00:00:10」이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['브라우저 시계가 23:59:50 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('23:59:50 에 홈 화면을 연다', async () => {
    await 방해창막기(page);
    await page.clock.setFixedTime(new Date(2026, 9, 18, 23, 59, 50, 0));
    await 홈.열기();
    await verify('브라우저 시계가 23:59:50 이다', await page.evaluate(() => new Date().toTimeString().slice(0, 8)), '23:59:50', { blocker: true });
    await verify('23:59:50 에는 타임세일 카운트다운이 「00:00:10」이다', (await 홈.타임세일시계.innerText()).trim(), '00:00:10');
  });
});
