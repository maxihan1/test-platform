import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-073',
  name: '1초를 기다리면 카운트다운이 1초 줄어든다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '공지 팝업 · 설문은 이미 닫았다', '브라우저 시계는 23:59:50 이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 안내창끄기(page);
    await 홈.열기();
    await verify('비회원이다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await verify('공지 팝업 · 설문은 이미 닫았다', [await 홈.공지팝업.count(), await 홈.설문.count()], [0, 0], { blocker: true });
  });

  await test.step('홈 화면에서 1초를 기다린다', async () => {
    const 앞글자 = (await 홈.시계.innerText()).trim();
    const 앞 = await 홈.시계초();
    await 홈.시계가바뀔때까지기다리기(앞글자);
    await verify('1초를 기다리면 카운트다운이 1초 줄어든다', 앞 - (await 홈.시계초()), 1);
  });

  await test.step('시계를 23:59:50 으로 맞추고 홈 화면을 연다', async () => {
    await page.clock.setFixedTime(new Date('2026-10-05T23:59:50'));
    await 홈.열기();
    await verify('브라우저 시계는 23:59:50 이다', await page.evaluate(() => new Date().toTimeString().slice(0, 8)), '23:59:50', { blocker: true });
    await verify('자정 10초 전에는 카운트다운이 「00:00:10」으로 보인다', (await 홈.시계.innerText()).trim(), '00:00:10');
  });
});
