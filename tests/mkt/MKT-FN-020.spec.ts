import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-020',
  name: '「참여하기」를 누르면 고객센터로 간다',
  platforms: ['desktop'],
  precondition: ['홈 화면에 「만족도 설문」 모달이 떠 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열고 설문 모달을 띄운다', async () => {
    await 홈.시계를멈춘다(new Date(2026, 9, 3, 12, 0, 0), new Date(2026, 9, 3, 12, 0, 1));
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.열기();
    await 홈.추천카드.first().waitFor();
    await page.clock.runFor(15000);
  });

  await test.step('홈 화면에 「만족도 설문」 모달이 떠 있는지 확인한다', async () => {
    await verify('홈 화면에 「만족도 설문」 모달이 떠 있다', await 홈.설문모달.isVisible(), true, { blocker: true });
  });

  await test.step('설문 모달에서 「참여하기」를 누른다', async () => {
    await 홈.설문참여하기.click();
    await 홈.바닥글.waitFor();
    await verify('「참여하기」를 누르면 고객센터로 간다', new URL(page.url()).pathname, '/support');
  });
});
