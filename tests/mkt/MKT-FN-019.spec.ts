import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-019',
  name: '홈에 머문 지 5~15초 사이에 설문 모달이 뜨고 「다음에」로 닫으면 다시 뜨지 않는다',
  platforms: ['desktop'],
  precondition: ['홈 화면을 열기 전에 시계를 제어할 수 있다', '홈 화면에 「만족도 설문」 모달이 떠 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열고 시계를 앞으로 돌린다', async () => {
    await 홈.시계를멈춘다(new Date(2026, 9, 3, 12, 0, 0), new Date(2026, 9, 3, 12, 0, 1));
    await 홈.공지팝업을치운다();
    await 홈.쿠키띠를치운다();
    await 홈.열기();
    await 홈.추천카드.first().waitFor();
    await page.clock.runFor(4900);
    const 다섯초전 = await 홈.설문모달.isVisible();
    await page.clock.runFor(10100);
    await verify('홈에 머문 지 5~15초 사이에 「만족도 설문」 모달이 뜬다', [다섯초전, await 홈.설문모달.isVisible()], [false, true]);
  });

  await test.step('설문 모달에서 「다음에」를 누르고 시계를 15초 앞으로 돌린다', async () => {
    await verify('홈 화면에 「만족도 설문」 모달이 떠 있다', await 홈.설문모달.isVisible(), true, { blocker: true });
    await 홈.설문다음에.click();
    await page.clock.runFor(15000);
    await verify('「다음에」를 누르면 모달이 닫힌다', await 홈.설문모달.count(), 0);
    await 홈.다시열고설정응답을기다린다();
    await 홈.추천카드.first().waitFor();
    await page.clock.runFor(15000);
    await verify('한 번 닫으면 브라우저 탭을 닫기 전까지 설문 모달이 다시 뜨지 않는다', await 홈.설문모달.count(), 0);
  });
});
