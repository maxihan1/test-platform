import { defineCase, test, verify } from '@platform/kit';

import { 처음방문인가 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-033',
  name: '「오늘 하루 보지 않기」를 끈 채 닫고 새로 고치면 공지 팝업이 다시 보인다',
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

  await test.step('공지 팝업이 보이고 「오늘 하루 보지 않기」가 꺼져 있는지 확인한다', async () => {
    await 홈.공지창.waitFor();
    await verify(
      '공지 팝업이 보이고 「오늘 하루 보지 않기」가 꺼져 있다',
      { 공지팝업: await 홈.공지창.isVisible(), 하루안봄: await 홈.공지하루안봄.isChecked() },
      { 공지팝업: true, 하루안봄: false },
      { blocker: true },
    );
  });

  await test.step('「오늘 하루 보지 않기」를 끈 채 「닫기」를 누르고 새로 고친다', async () => {
    await 홈.공지닫기.click();
    await page.reload();
    await 홈.추천카드들.first().waitFor();
    await verify('「오늘 하루 보지 않기」를 끈 채 닫고 새로 고치면 공지 팝업이 다시 보인다', await 홈.공지창.isVisible(), true);
  });
});
