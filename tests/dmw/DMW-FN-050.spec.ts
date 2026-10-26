import { defineCase, test, verify } from '@platform/kit';

import { 시계멈추기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-050',
  name: '홈에 들어오고 5초 전에는 「만족도 설문」 모달이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page, { 설문: false });
  await page.clock.install();

  await test.step('홈 화면을 열고 5초 전까지 기다린다', async () => {
    await 홈.열고설정응답까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
    await 시계멈추기(page);
    await page.clock.runFor(4900);
    await verify('홈에 들어오고 5초 전에는 「만족도 설문」 모달이 보이지 않는다', await 홈.설문창.창.isVisible(), false);
  });

  await test.step('홈 화면을 열고 15초까지 기다린다', async () => {
    await page.clock.runFor(10100);
    await 홈.설문창.뜰때까지();
    await verify('홈에 들어오고 15초 안에 「만족도 설문」 모달이 보인다', await 홈.설문창.창.isVisible(), true);
  });
});
