import { defineCase, test, verify } from '@platform/kit';

import { 시계멈추기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-033',
  name: '배너에 마우스를 올려 두면 4초가 지나도 다음 장으로 넘어가지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await page.clock.install();

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.배너.그려질때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 배너 첫 장이 보인다', await 홈.배너.현재장(), 1, { blocker: true });
    await 시계멈추기(page);
  });

  await test.step('배너에 마우스를 올리고 4초를 보낸다', async () => {
    await 홈.배너.영역.hover();
    await page.clock.runFor(4000);
    await verify('배너에 마우스를 올려 두면 4초가 지나도 다음 장으로 넘어가지 않는다', await 홈.배너.현재장(), 1);
  });

  await test.step('배너에서 마우스를 치우고 4초를 보낸다', async () => {
    await 홈.마우스치우기();
    await page.clock.runFor(4000);
    await verify('배너에서 마우스를 치우면 4초 뒤 다시 다음 장으로 넘어간다', await 홈.배너.현재장(), 2);
  });
});
