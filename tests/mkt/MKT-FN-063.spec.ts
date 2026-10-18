import { defineCase, test, verify } from '@platform/kit';
import { 공지와쿠키만막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 나타났나, 사라졌나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-063',
  name: '한 번 닫은 탭에서는 15초가 지나도 「만족도 설문」 모달이 다시 뜨지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['「만족도 설문」 모달을 한 번 닫았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열어 「만족도 설문」 모달을 띄우고 닫는다', async () => {
    await 공지와쿠키만막기(page);
    await page.clock.install();
    await 홈.열기();
    await page.clock.runFor(15000);
    await verify('「만족도 설문」 모달이 떠 있다', await 나타났나(홈.설문팝업), true, { blocker: true });
    await 홈.설문다음에버튼.click();
    await verify('「만족도 설문」 모달이 닫혀 있다', await 사라졌나(홈.설문팝업), true, { blocker: true });
  });

  await test.step('같은 탭에서 홈 화면을 다시 열고 15초를 보낸다', async () => {
    await 홈.열기();
    await page.clock.runFor(15000);
    await 두프레임뒤(page);
    await verify('한 번 닫은 탭에서는 15초가 지나도 「만족도 설문」 모달이 다시 뜨지 않는다', await 홈.설문팝업.isVisible(), false);
  });
});
