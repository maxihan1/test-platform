import { defineCase, test, verify } from '@platform/kit';
import { 쿠키띠와설문만막기 } from './helpers/browser.helper.js';
import { 나타났나, 사라졌나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-045',
  name: '체크하지 않고 닫으면 새로 고칠 때 공지 팝업이 다시 뜬다',
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

  await test.step('공지 팝업을 그냥 「닫기」로 닫고 새로 고친다', async () => {
    await 홈.공지닫기버튼.click();
    await verify('공지 팝업이 닫힌다', await 사라졌나(홈.공지팝업), true, { blocker: true });
    await page.reload();
    await 홈.그려질때까지();
    await verify('체크하지 않고 닫으면 새로 고칠 때 공지 팝업이 다시 뜬다', await 나타났나(홈.공지팝업), true);
  });
});
