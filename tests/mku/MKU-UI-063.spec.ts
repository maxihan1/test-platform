import { defineCase, test, verify } from '@platform/kit';

import { 상자, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-063',
  name: '홈을 열고 기다리면 배너와 탭 사이에 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 이벤트 띠를 기다린다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.이벤트띠.waitFor();
    const 띠 = await 상자(홈.이벤트띠);
    const 배너 = await 상자(홈.배너);
    const 탭 = await 상자(홈.글탭목록);
    await verify(
      '홈을 열고 기다리면 배너와 탭 사이에 이벤트 띠 「🎉 가을 맞이 전 상품 무료 배송」이 보인다',
      { 띠글: await 홈.이벤트띠글.isVisible(), 배너와탭사이: 띠.y >= 배너.y + 배너.height - 1 && 띠.y + 띠.height <= 탭.y + 1 },
      { 띠글: true, 배너와탭사이: true },
    );
  });
});
