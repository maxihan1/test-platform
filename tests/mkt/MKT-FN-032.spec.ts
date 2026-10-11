import { defineCase, test, verify } from '@platform/kit';

import { 처음방문인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-032',
  name: '「오늘 하루 보지 않기」를 켜고 닫으면 같은 날 홈을 다시 열어도 공지 팝업이 보이지 않는다',
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
  });

  await test.step('공지 팝업이 보이는지 확인한다', async () => {
    await 홈.공지창.waitFor();
    await verify('공지 팝업이 보인다', await 홈.공지창.isVisible(), true, { blocker: true });
  });

  await test.step('「오늘 하루 보지 않기」를 켜고 「닫기」를 누른 뒤 홈을 다시 연다', async () => {
    await 홈.공지하루안봄.check();
    await 홈.공지닫기.click();
    await 홈.열기();
    await 홈.추천카드들.first().waitFor();
    await verify('「오늘 하루 보지 않기」를 켜고 닫으면 같은 날 홈을 다시 열어도 공지 팝업이 보이지 않는다', await 홈.공지창.isVisible(), false);
  });
});
