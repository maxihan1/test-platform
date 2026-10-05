import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-020',
  name: '처음 들어온 홈 화면 가운데에 공지 팝업이 보인다',
  platforms: ['desktop'],
  precondition: ['처음 방문한 비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.공지팝업.waitFor();
    await verify('처음 방문한 비회원이다', [await 홈.머리글.로그인링크.isVisible(), await 홈.쿠키띠.영역.isVisible()], [true, true], { blocker: true });
    await 홈.공지팝업.getByRole('checkbox').waitFor();
    await verify('처음 들어온 홈 화면 가운데에 공지 팝업이 보인다', [await 홈.공지팝업.isVisible(), await 홈.공지팝업이가운데인가()], [true, true]);
    await verify(
      '공지 팝업에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 보인다',
      [await 홈.공지닫기버튼.isVisible(), await 홈.공지체크박스.isVisible()],
      [true, true],
    );
  });
});
