import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-017',
  name: '타임세일 카운트다운은 자정까지 남은 시간을 1초마다 줄여 보여 준다',
  platforms: ['desktop'],
  precondition: ['홈 화면을 열기 전에 시계를 제어할 수 있다', '지금 시각이 23시 59분 50초다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 남은시간 = async (): Promise<string> => (await 홈.카운트다운.innerText()).slice(-8);

  await test.step('홈 화면을 열고 카운트다운을 읽는다', async () => {
    await 홈.시계를멈춘다(new Date(2026, 9, 3, 23, 59, 49), new Date(2026, 9, 3, 23, 59, 50));
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.설문을치운다();
    await 홈.열기();
    await 홈.카운트다운.filter({ hasNotText: '--:--:--' }).waitFor();
    await verify('종료 시각은 매일 자정이므로 23시 59분 50초에는 「00:00:10」이 보인다', await 남은시간(), '00:00:10');
  });

  await test.step('홈 화면을 열고 시계를 1초 앞으로 돌린다', async () => {
    await 홈.열기();
    await 홈.카운트다운.filter({ hasNotText: '--:--:--' }).waitFor();
    const 전 = await 남은시간();
    await page.clock.runFor(1000);
    await verify('카운트다운은 1초마다 줄어든다', [전, await 남은시간()], ['00:00:10', '00:00:09']);
  });
});
