import { defineCase, test, verify } from '@platform/kit';
import { 쿠키띠와설문만막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-039',
  name: '공지 팝업에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 보인다',
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

  await test.step('공지 팝업을 확인한다', async () => {
    await verify(
      '공지 팝업에 「닫기」 버튼과 「오늘 하루 보지 않기」 체크박스가 보인다',
      { 닫기: await 홈.공지닫기버튼.isVisible(), 오늘하루보지않기: await 홈.공지오늘하루체크.isVisible() },
      { 닫기: true, 오늘하루보지않기: true },
    );
  });
});
