import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 처음방문인가, 화면가운데인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-044',
  name: '처음 들어온 홈 가운데에 공지 팝업이 보인다',
  precondition: ['공지 팝업을 닫은 적 없는 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('공지 팝업을 닫은 적 없는지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page, { 공지팝업: false });
    await 홈.열기();
    await 홈.공지창.waitFor();
    await verify(
      '처음 들어온 홈 가운데에 공지 팝업이 보인다',
      { 공지팝업: await 홈.공지창.isVisible(), 화면가운데: await 화면가운데인가(홈.공지창) },
      { 공지팝업: true, 화면가운데: true },
    );
  });
});
