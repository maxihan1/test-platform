import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-027',
  name: '마지막 배너에서 4초가 지나면 첫 장으로 돌아간다',
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

  await test.step('배너 세 번째 점을 누르고 4초를 기다린다', async () => {
    await 홈.점(3).click();
    await verify('배너 세 번째 점을 누르면 마지막 배너가 보인다', await 홈.현재점번호(), 3, { blocker: true });
    await page.mouse.move(5, 5);
    await page.clock.runFor(4000);
    await verify(
      '마지막 배너에서 4초가 지나면 첫 장으로 돌아간다',
      { 현재점: await 홈.현재점번호(), 보이는배너: await 홈.보이는배너번호() },
      { 현재점: 1, 보이는배너: 1 },
    );
  });
});
