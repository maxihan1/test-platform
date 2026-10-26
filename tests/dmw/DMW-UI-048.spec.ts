import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-048',
  name: '만족도 설문 「다음에」를 누르면 모달이 닫힌다',
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
  });

  await test.step('만족도 설문 모달의 「다음에」를 누른다', async () => {
    await 홈.설문창.버튼('다음에').click();
    await 홈.설문창.사라질때까지();
    await verify('만족도 설문 「다음에」를 누르면 모달이 닫힌다', await 홈.설문창.창.isVisible(), false);
  });
});
