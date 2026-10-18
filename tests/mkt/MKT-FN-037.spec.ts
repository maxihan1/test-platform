import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-037',
  name: '배너에 마우스를 올려 두면 4초가 지나도 장이 넘어가지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.시계멈춰두기();
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업없나(), true, { blocker: true });
    await verify('배너가 1번째 장이다', await 홈.현재배너번호(), 1, { blocker: true });
  });

  await test.step('배너에 마우스를 올린 채 4초를 보낸다', async () => {
    await 홈.배너.hover();
    await page.clock.runFor(4000);
    await verify('배너에 마우스를 올려 두면 4초가 지나도 장이 넘어가지 않는다', await 홈.현재배너번호(), 1);
  });

  await test.step('마우스를 배너 밖으로 치우고 4초를 보낸다', async () => {
    await page.mouse.move(5, 5);
    await page.clock.runFor(4000);
    await verify('마우스를 치우면 자동 넘김이 다시 시작돼 다음 장으로 넘어간다', await 홈.배너장이자리잡았나(2), true);
  });
});
