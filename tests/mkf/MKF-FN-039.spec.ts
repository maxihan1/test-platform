import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-039',
  name: '2초가 지나면 카운트다운이 2초 줄어 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 2초를 기다린다', async () => {
    await page.clock.install();
    await 방해막기(page);
    await 홈.열기();
    await 홈.시계.filter({ hasText: /\d\d:\d\d:\d\d/ }).waitFor();
    const 처음 = await 홈.시계초();
    await page.clock.runFor(2000);
    const 나중 = await 홈.시계초();
    await verify('2초가 지나면 카운트다운이 2초 줄어 있다', 처음 - 나중, 2);
  });
});
