import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-174',
  name: '공지 팝업 오른쪽 위에 닫기 X 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['처음 방문한 비회원이다'],
  unconfirmed: '기획서와 다름 — 차이 D5: 공지 팝업 오른쪽 위에 기획서에 없는 X 버튼이 있다 (작성 요청 5873)',
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.공지팝업.waitFor();
    await verify('처음 방문한 비회원이다', [await 홈.머리글.로그인링크.isVisible(), await 홈.쿠키띠.영역.isVisible()], [true, true], { blocker: true });
    await verify('공지 팝업 오른쪽 위에 닫기 X 버튼이 보인다', [await 홈.공지닫기X.isVisible(), await 홈.공지닫기X가오른쪽위인가()], [true, true]);
  });
});
