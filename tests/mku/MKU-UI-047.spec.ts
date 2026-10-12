import { defineCase, test, verify } from '@platform/kit';

import { 처음방문인가, 화면가운데인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-047',
  name: '홈에 처음 들어오면 화면 가운데에 공지 팝업이 보인다',
  precondition: ['처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('처음 방문한 브라우저인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page, { 공지팝업: false });
    await 홈.열기();
    await 홈.공지창.waitFor();
    await verify(
      '홈에 처음 들어오면 화면 가운데에 공지 팝업이 보인다',
      { 공지팝업: await 홈.공지창.isVisible(), 화면가운데: await 화면가운데인가(홈.공지창) },
      { 공지팝업: true, 화면가운데: true },
    );
  });
});
