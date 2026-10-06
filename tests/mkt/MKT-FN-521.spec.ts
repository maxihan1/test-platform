import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가짜설정응답 } from './components/site-extra.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-521',
  name: '공지 팝업 설정이 꺼져 있으면 홈 화면에 공지 팝업이 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['처음 방문한 비회원이다', '설정 응답은 가짜 응답(모킹)이다 — 공지 팝업 꺼짐'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 가짜 = new 가짜설정응답(page, { noticePopup: false });

  try {
    await test.step('설정 응답을 공지 팝업 꺼짐으로 바꿔 둔다', async () => {
      await 가짜.걸기();
    });

    await test.step('홈 화면을 연다', async () => {
      await 홈.열기();
      await verify('처음 방문한 비회원이다', [await 홈.머리글.로그인링크.isVisible(), await 홈.쿠키띠.영역.isVisible()], [true, true], { blocker: true });
      await verify('공지 팝업 설정이 꺼져 있으면 홈 화면에 공지 팝업이 보이지 않는다', await 홈.공지팝업.count(), 0);
    });
  } finally {
    await 가짜.걷기();
  }
});
