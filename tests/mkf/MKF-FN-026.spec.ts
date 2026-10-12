import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-026',
  name: '배너에 마우스를 올려 두면 5초가 지나도 같은 장이 보인다',
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
    await page.clock.install();
    await 방해막기(page);
    await 홈.열기();
    await 홈.슬라이드.first().waitFor();
  });

  await test.step('홈이 첫 장인지 확인한다', async () => {
    await verify('홈을 열었을 때 배너가 첫 장이다', await 홈.현재점번호(), 1, { blocker: true });
  });

  await test.step('배너에 마우스를 올리고 5초를 기다린다', async () => {
    await 홈.배너.hover();
    await page.clock.runFor(5000);
    await verify(
      '배너에 마우스를 올려 두면 5초가 지나도 같은 장이 보인다',
      { 현재점: await 홈.현재점번호(), 보이는배너: await 홈.보이는배너번호() },
      { 현재점: 1, 보이는배너: 1 },
    );
  });

  await test.step('배너에서 마우스를 치우고 5초를 기다린다', async () => {
    await page.mouse.move(5, 5);
    await page.clock.runFor(5000);
    await verify(
      '배너에서 마우스를 치우면 자동 넘김이 다시 시작해 다음 장이 보인다',
      { 현재점: await 홈.현재점번호(), 보이는배너: await 홈.보이는배너번호() },
      { 현재점: 2, 보이는배너: 2 },
    );
  });
});
