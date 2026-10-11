import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-026',
  name: '홈을 열고 4초가 지나면 배너가 두 번째 장으로 넘어간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 4초를 기다린다', async () => {
    await page.clock.install();
    await 방해막기(page);
    await 홈.열기();
    await 홈.슬라이드.first().waitFor();
    await verify('홈을 열었을 때 배너가 첫 장이다', await 홈.현재점번호(), 1, { blocker: true });
    await page.clock.runFor(4000);
    await verify(
      '홈을 열고 4초가 지나면 배너가 두 번째 장으로 넘어간다',
      { 현재점: await 홈.현재점번호(), 보이는배너: await 홈.보이는배너번호() },
      { 현재점: 2, 보이는배너: 2 },
    );
  });
});
