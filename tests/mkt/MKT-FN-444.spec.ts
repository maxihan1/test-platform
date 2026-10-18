import { defineCase, test, verify } from '@platform/kit';
import { 좁은화면인가, 쿠키띠와설문만막기 } from './helpers/browser.helper.js';
import { 두프레임뒤 } from './helpers/common-tools.helper.js';
import { 세로위치읽기 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-444',
  name: '공지 팝업이 열려 있는 동안 뒤 화면이 스크롤되지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('처음 방문한 브라우저로 홈 화면을 연다', async () => {
    await 쿠키띠와설문만막기(page);
    await 홈.열기();
    await 홈.공지팝업.waitFor();
    await verify('공지 동의 기록이 없다', await page.evaluate(() => localStorage.getItem('dm_notice_hide') === null), true, { blocker: true });
    await verify('공지 팝업이 떠 있다', await 홈.공지팝업.isVisible(), true, { blocker: true });
  });

  await test.step('공지 팝업이 떠 있는 동안 화면을 굴린다', async () => {
    await page.mouse.move(200, 300);
    if (!좁은화면인가(page)) await page.mouse.wheel(0, 600);
    await page.keyboard.press('End');
    await 두프레임뒤(page);
    await verify('공지 팝업이 열려 있는 동안 뒤 화면이 스크롤되지 않는다', await 세로위치읽기(page), 0);
  });
});
