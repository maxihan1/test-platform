import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-041',
  name: '홈에 머무르면 설문 팝업이 보인다',
  precondition: ['설문 팝업을 닫은 적 없는 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 머무른다', async () => {
    await page.clock.install();
    await 방해막기(page, { 설문: false });
    await 홈.열기();
    await 홈.추천카드들.first().waitFor();
    await verify('홈을 연 직후에는 설문 팝업이 보이지 않는다', await 홈.설문창.isVisible(), false, { blocker: true });
    await page.clock.runFor(15000);
    await verify('홈에 머무르면 설문 팝업이 보인다', await 홈.설문창.isVisible(), true);
  });
});
