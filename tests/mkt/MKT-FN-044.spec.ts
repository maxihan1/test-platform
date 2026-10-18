import { defineCase, test, verify } from '@platform/kit';
import { 쿠키띠와설문만막기 } from './helpers/browser.helper.js';
import { 사라졌나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-044',
  name: '「오늘 하루 보지 않기」를 켜고 닫으면 같은 날 다시 들어와도 공지 팝업이 뜨지 않는다',
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
  });

  await test.step('공지 팝업의 「오늘 하루 보지 않기」를 켜고 「닫기」를 누른 뒤 홈 화면을 다시 연다', async () => {
    await 홈.공지오늘하루체크.check();
    await 홈.공지닫기버튼.click();
    await verify('공지 팝업이 닫힌다', await 사라졌나(홈.공지팝업), true, { blocker: true });
    await 홈.열기();
    await verify('「오늘 하루 보지 않기」를 켜고 닫으면 같은 날 다시 들어와도 공지 팝업이 뜨지 않는다', await 홈.공지팝업보이나(), false);
  });
});
