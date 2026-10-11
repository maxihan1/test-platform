import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-020',
  name: '1초가 지나면 타임세일 카운트다운이 1초 줄어든다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '브라우저 시각이 23:59:50 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('홈 화면에서 1초를 기다린다', async () => {
    await 방해막기(page);
    await 홈.추천까지열기();
    await 머리.로그인링크.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    const 전글 = await 홈.시계.innerText();
    const 전 = await 홈.시계초();
    await 홈.시계.filter({ hasNotText: 전글 }).waitFor();
    const 후 = await 홈.시계초();
    await verify('1초가 지나면 타임세일 카운트다운이 1초 줄어든다', { 줄어든초: 전 - 후 }, { 줄어든초: 1 });
  });

  await test.step('브라우저 시각을 23:59:50 으로 두고 홈 화면을 연다', async () => {
    await page.clock.setFixedTime(new Date(2026, 9, 11, 23, 59, 50));
    await 홈.추천까지열기();
    await verify('브라우저 시각이 23:59:50 이다', await page.evaluate(() => new Date().toTimeString().slice(0, 8)), '23:59:50', { blocker: true });
    await verify('브라우저 시각이 23:59:50 이면 타임세일 카운트다운이 「00:00:10」 이다', await 홈.시계.innerText(), '00:00:10');
  });
});
