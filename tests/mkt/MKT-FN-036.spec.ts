import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-036',
  name: '마지막 장 다음에는 배너가 첫 장으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열고 배너를 3번째 장으로 옮긴다', async () => {
    await 방해창막기(page);
    await 홈.시계멈춰두기();
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업없나(), true, { blocker: true });
    await 홈.배너점(3).click();
    await page.mouse.move(5, 5);
    await verify('배너가 3번째 장이다', await 홈.배너장이자리잡았나(3), true, { blocker: true });
  });

  await test.step('배너가 3번째 장일 때 4초를 보낸다', async () => {
    await page.clock.runFor(4000);
    await verify('마지막 장 다음에는 배너가 첫 장으로 돌아간다', await 홈.배너장이자리잡았나(1), true);
  });
});
