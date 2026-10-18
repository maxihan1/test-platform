import { defineCase, test, verify } from '@platform/kit';
import { 공지와쿠키만막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-060',
  name: '홈에 머문 지 5초 전에는 「만족도 설문」 모달이 뜨지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 공지와쿠키만막기(page);
    await page.clock.install();
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업보이나(), false, { blocker: true });
  });

  await test.step('홈 화면을 열고 5초 전까지 기다린다', async () => {
    await page.clock.runFor(4999);
    await 두프레임뒤(page);
    await verify('홈에 머문 지 5초 전에는 「만족도 설문」 모달이 뜨지 않는다', await 홈.설문팝업.isVisible(), false);
  });

  await test.step('홈 화면에서 15초까지 기다린다', async () => {
    await page.clock.runFor(10001);
    await verify('홈에 머문 지 15초가 되기 전에 「만족도 설문」 모달이 뜬다', await 나타났나(홈.설문팝업), true);
  });
});
