import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-493',
  name: '공지 팝업 설정이 꺼져 있으면 홈에 공지 팝업이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '공지 팝업 설정은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page, { 공지: false });

  await page.context().route('**/api/settings', async (경로) => {
    await 경로.fulfill({ json: { noticePopup: false, unstable: false } });
  });
  try {
    await test.step('공지 팝업 설정을 꺼진 값으로 둔 채 홈 화면을 연다', async () => {
      await 홈.열고설정응답까지();
      await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
      await verify('공지 팝업 설정이 꺼져 있으면 홈에 공지 팝업이 보이지 않는다', await 홈.공지창.창.isVisible(), false);
    });
  } finally {
    await page.context().unroute('**/api/settings');
  }
});
