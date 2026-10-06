import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-043',
  name: '홈 화면에서 4초를 기다리면 둘째 배너가 현재 배너로 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '공지 팝업 · 설문은 이미 닫았다'],
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

  await test.step('홈 화면에서 4초를 기다린다', async () => {
    await page.waitForTimeout(4200);
    await verify('홈 화면에서 4초를 기다리면 둘째 배너가 현재 배너로 바뀐다', await 홈.현재배너번호(), 2);
  });

  await test.step('셋째 배너가 될 때까지 기다린 뒤 4초를 더 기다린다', async () => {
    await 홈.현재배너가될때까지기다리기(3);
    await page.waitForTimeout(4200);
    await verify('마지막 배너 다음에는 첫째 배너가 현재 배너로 돌아온다', await 홈.현재배너번호(), 1);
  });
});
