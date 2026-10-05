import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-017',
  name: '홈 배너 좌우에 「이전」 · 「다음」 화살표가 보인다',
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
    await verify('홈 배너 좌우에 「이전」 · 「다음」 화살표가 보인다', await 홈.화살표가좌우에있나(), true);
    await verify('배너 아래에 현재 장을 나타내는 점이 3개 보인다', [await 홈.점들.count(), await 홈.점이배너아래인가()], [3, true]);
    await verify(
      '처음에는 첫째 점만 색이 채워져 보인다',
      [await 홈.점이채워졌나(1), await 홈.점이채워졌나(2), await 홈.점이채워졌나(3)],
      [true, false, false],
    );
  });
});
