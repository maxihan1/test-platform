import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-046',
  name: '배너에 마우스를 올리고 5초를 기다리면 현재 배너가 바뀌지 않는다',
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

  await test.step('홈 배너에 마우스를 올리고 5초를 기다린다', async () => {
    await 홈.배너.hover();
    const 올린뒤 = await 홈.현재배너번호();
    await page.waitForTimeout(5000);
    await verify('배너에 마우스를 올리고 5초를 기다리면 현재 배너가 바뀌지 않는다', await 홈.현재배너번호(), 올린뒤);
  });

  await test.step('마우스를 배너 밖으로 옮기고 5초를 기다린다', async () => {
    await page.mouse.move(5, 5);
    const 치운뒤 = await 홈.현재배너번호();
    await page.waitForTimeout(5000);
    await verify('마우스를 치우면 현재 배너가 다음 장으로 바뀐다', await 홈.현재배너번호(), (치운뒤 % 3) + 1);
  });
});
