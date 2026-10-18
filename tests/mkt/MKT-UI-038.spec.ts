import { defineCase, test, verify } from '@platform/kit';
import { 쿠키띠와설문만막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-038',
  name: '홈에 처음 들어오면 공지 팝업이 화면 가운데에 뜬다',
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
    await verify('홈에 처음 들어오면 공지 팝업이 화면 가운데에 뜬다', await 홈.공지팝업이가운데인가(), true);
  });
});
