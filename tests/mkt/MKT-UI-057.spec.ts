import { defineCase, test, verify } from '@platform/kit';
import { 공지와쿠키만막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 이동한화면, 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-057',
  name: '「참여하기」를 누르면 고객센터 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['「만족도 설문」 모달이 떠 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 이동 = new 이동한화면(page);

  await test.step('홈 화면을 열고 「만족도 설문」 모달을 띄운다', async () => {
    await 공지와쿠키만막기(page);
    await page.clock.install();
    await 홈.열기();
    await page.clock.runFor(15000);
    await verify('「만족도 설문」 모달이 떠 있다', await 나타났나(홈.설문팝업), true, { blocker: true });
  });

  await test.step('「만족도 설문」 모달의 「참여하기」를 누른다', async () => {
    await 홈.설문참여버튼.click();
    await verify('「참여하기」를 누르면 고객센터 화면으로 간다', await 나타났나(이동.고객센터제목), true);
  });
});
