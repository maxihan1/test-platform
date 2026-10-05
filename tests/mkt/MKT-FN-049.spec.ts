import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-049',
  name: '배너의 셋째 점을 누르면 셋째 배너가 현재 배너로 바뀐다',
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

  await test.step('홈 배너의 셋째 점을 누른다', async () => {
    await 홈.점(3).click();
    await verify('배너의 셋째 점을 누르면 셋째 배너가 현재 배너로 바뀐다', await 홈.보이는배너번호(), 3);
    await verify('셋째 점의 색이 채워진다', await 홈.점이채워졌나(3), true);
  });
});
