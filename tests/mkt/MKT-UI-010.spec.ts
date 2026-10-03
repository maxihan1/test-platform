import { defineCase, test, verify } from '@platform/kit';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-010',
  name: '홈에 머문 지 15초 안에 「참여하기」 「다음에」 버튼이 있는 「만족도 설문」 모달이 보인다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 시작 = new Date();
  await page.clock.install({ time: 시작 });
  await page.clock.pauseAt(new Date(시작.getTime() + 1000));

  await test.step('홈에 5~15초 머문다', async () => {
    await 홈.열기();
    await 홈.추천상품카드들().first().waitFor();
    await page.clock.runFor(15000);
    await verify('홈에 머문 지 15초 안에 「만족도 설문」 모달이 보인다', await 홈.설문모달().isVisible(), true, { blocker: true });
    await verify(
      '설문 모달에 「참여하기」 버튼과 「다음에」 버튼이 보인다',
      [await 홈.설문참여버튼().isVisible(), await 홈.설문다음에버튼().isVisible()],
      [true, true],
    );
  });
});
