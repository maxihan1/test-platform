import { defineCase, test, verify } from '@platform/kit';
import { 쿠키띠와설문만막기 } from './helpers/browser.helper.js';
import { 가짜설정응답걸기 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-515',
  name: '공지 팝업이 꺼져 있으면 홈에 들어와도 공지 팝업이 뜨지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['설정 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  let 걷기: (() => Promise<void>) | undefined;

  try {
    await test.step('공지 팝업이 꺼진 설정 응답으로 홈 화면을 연다', async () => {
      await 쿠키띠와설문만막기(page);
      걷기 = await 가짜설정응답걸기(page, { noticePopup: false });
      const 설정응답 = page.waitForResponse((r) => r.url().includes('/api/settings'));
      await 홈.열기();
      const 설정 = (await (await 설정응답).json()) as { noticePopup: boolean };
      await verify('설정 응답에서 공지 팝업이 꺼져 있다', 설정.noticePopup, false, { blocker: true });
      await verify('공지 팝업이 꺼져 있으면 홈에 들어와도 공지 팝업이 뜨지 않는다', await 홈.공지팝업보이나(), false);
    });
  } finally {
    if (걷기) await 걷기();
  }
});
