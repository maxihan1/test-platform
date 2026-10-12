import { defineCase, test, verify } from '@platform/kit';

import { 처음방문인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-036',
  name: '공지 팝업 설정이 꺼짐이면 홈에 공지 팝업이 보이지 않는다',
  precondition: ['설정 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('처음 방문한 브라우저인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
  });

  await page.context().route('**/api/settings', (route) => route.fulfill({ json: { noticePopup: false, unstable: false } }));
  try {
    await test.step('공지 팝업 설정을 꺼짐으로 준 채 홈을 연다', async () => {
      await 방해막기(page, { 공지팝업: false });
      await 홈.열기();
      await 홈.추천카드들.first().waitFor();
      await verify('공지 팝업 설정이 꺼짐이면 홈에 공지 팝업이 보이지 않는다', await 홈.공지창.isVisible(), false);
    });
  } finally {
    await page.context().unroute('**/api/settings');
  }
});
