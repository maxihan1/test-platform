import { defineCase, test, verify } from '@platform/kit';

import { 시계멈추기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-053',
  name: '설문 모달을 한 번 닫으면 같은 탭에서 새로 고쳐도 설문 모달이 다시 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page, { 설문: false });
  await page.clock.install();

  await test.step('만족도 설문 모달이 뜬 홈 화면을 연다', async () => {
    await 홈.열고설정응답까지();
    await page.clock.runFor(15000);
    await 홈.설문창.뜰때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('만족도 설문 모달이 보인다', await 홈.설문창.창.isVisible(), true, { blocker: true });
    await 홈.설문창.버튼('다음에').click();
    await 홈.설문창.사라질때까지();
  });

  await test.step('설문 모달을 닫은 뒤 홈 화면을 새로 고치고 15초를 보낸다', async () => {
    const 설정응답 = page.waitForResponse((r) => r.url().includes('/api/settings'));
    await page.reload();
    await 홈.그려질때까지();
    await 설정응답;
    await 시계멈추기(page);
    await page.clock.runFor(15000);
    await verify('설문 모달을 한 번 닫으면 같은 탭에서 새로 고쳐도 설문 모달이 다시 보이지 않는다', await 홈.설문창.창.isVisible(), false);
  });
});
