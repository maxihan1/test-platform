import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-047',
  name: '만족도 설문 「참여하기」를 누르면 고객센터 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 제목 = new 화면제목(page);
  await 안내창막기(page, { 설문: false });
  await page.clock.install();

  await test.step('만족도 설문 모달이 뜬 홈 화면을 연다', async () => {
    await 홈.열고설정응답까지();
    await page.clock.runFor(15000);
    await 홈.설문창.뜰때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('만족도 설문 모달이 보인다', await 홈.설문창.창.isVisible(), true, { blocker: true });
  });

  await test.step('만족도 설문 모달의 「참여하기」를 누른다', async () => {
    await Promise.all([page.waitForEvent('framenavigated', (틀) => 틀 === page.mainFrame()), 홈.설문창.버튼('참여하기').click()]);
    await page.waitForLoadState('domcontentloaded');
    await 홈.머리.그려질때까지();
    await verify('만족도 설문 「참여하기」를 누르면 고객센터 화면이 보인다', await 제목.글('고객센터').isVisible(), true);
  });
});
