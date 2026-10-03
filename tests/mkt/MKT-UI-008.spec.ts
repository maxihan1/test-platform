import { defineCase, test, verify } from '@platform/kit';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-008',
  name: '홈 화면 가운데에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 있는 공지 팝업이 보인다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.추천상품카드들().first().waitFor();
    const 위치 = await 홈.화면중심기준위치(홈.공지팝업());
    await verify(
      '홈에 처음 들어오면 공지 팝업이 화면 가운데에 보인다',
      [await 홈.공지팝업().isVisible(), Math.abs(위치.가로) <= 2, Math.abs(위치.세로) <= 16],
      [true, true, true],
      { blocker: true },
    );
    await verify(
      '공지 팝업에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 보인다',
      [await 홈.공지팝업닫기버튼().isVisible(), await 홈.공지팝업하루숨김체크().isVisible()],
      [true, true],
    );
  });
});
