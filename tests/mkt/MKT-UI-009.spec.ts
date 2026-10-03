import { defineCase, test, verify } from '@platform/kit';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-009',
  name: '홈 화면의 배너와 탭 사이에 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 보인다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  let 띠보내기: () => void = () => undefined;
  const 띠대기 = new Promise<void>((다음) => {
    띠보내기 = 다음;
  });
  await page.context().route('**/api/event-strip', async (route) => {
    await 띠대기;
    await route.continue();
  });

  try {
    await test.step('홈 화면을 열고 이벤트 띠가 들어오기를 기다린다', async () => {
      await 홈.열기();
      await 홈.글제목링크들().first().waitFor();
      const 들어오기전탭 = await 홈.인기글탭().boundingBox();
      await verify('이벤트 띠가 아직 보이지 않는다', await 홈.이벤트띠().isVisible(), false, { blocker: true });
      띠보내기();
      await 홈.이벤트띠().waitFor();
      const 들어온뒤탭 = await 홈.인기글탭().boundingBox();
      await verify(
        '이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 배너와 탭 사이에 보인다',
        [
          await 홈.이벤트띠문구('🎉 가을 맞이 전 상품 무료 배송').isVisible(),
          await 홈.위아래로놓여있는가(홈.배너(), 홈.이벤트띠()),
          await 홈.위아래로놓여있는가(홈.이벤트띠(), 홈.인기글탭()),
        ],
        [true, true, true],
      );
      await verify(
        '띠가 들어오면 그 아래 탭이 아래로 밀려난다',
        들어오기전탭 !== null && 들어온뒤탭 !== null && 들어온뒤탭.y > 들어오기전탭.y,
        true,
      );
    });
  } finally {
    띠보내기();
    await page.context().unrouteAll({ behavior: 'wait' });
  }
});
