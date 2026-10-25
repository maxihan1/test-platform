import { defineCase, test, verify } from '@platform/kit';

import { 시계멈추기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-031',
  name: '홈 배너는 4초가 지나면 다음 장으로 넘어간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await page.clock.install();

  await test.step('홈 화면을 열고 4초를 보낸다', async () => {
    await 홈.열기();
    await 홈.배너.그려질때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 배너 첫 장이 보인다', await 홈.배너.현재장(), 1, { blocker: true });
    await 시계멈추기(page);
    await page.clock.runFor(4000);
    await verify('홈 배너는 4초가 지나면 다음 장으로 넘어간다', await 홈.배너.현재장(), 2);
  });
});
