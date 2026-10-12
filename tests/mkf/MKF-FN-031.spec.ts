import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-031',
  name: '홈을 열면 배너보다 늦게 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 이벤트 띠가 들어오기를 기다린다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.슬라이드.first().waitFor();
    const 배너가보일때띠가보이나 = await 홈.이벤트띠.isVisible();
    await 홈.이벤트띠.waitFor();
    await verify(
      '홈을 열면 배너보다 늦게 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 보인다',
      { 배너가보일때띠가보임: 배너가보일때띠가보이나, 띠글: await 홈.이벤트띠글.isVisible() },
      { 배너가보일때띠가보임: false, 띠글: true },
    );
  });
});
