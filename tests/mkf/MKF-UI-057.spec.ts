import { defineCase, test, verify } from '@platform/kit';

import { 상자, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-057',
  name: '탭 아래 「추천 상품」에 상품 8개가 가로 한 줄로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.추천카드들.first().waitFor();
    const 윗선들 = await 홈.추천카드들.evaluateAll((카드) => 카드.map((c) => Math.round(c.getBoundingClientRect().top)));
    await verify(
      '탭 아래 「추천 상품」에 상품 8개가 가로 한 줄로 보인다',
      {
        상품수: 윗선들.length,
        가로한줄: new Set(윗선들).size === 1,
        탭아래: (await 상자(홈.추천영역)).y > (await 상자(홈.글탭목록)).y,
      },
      { 상품수: 8, 가로한줄: true, 탭아래: true },
    );
  });
});
