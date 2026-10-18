import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-035',
  name: '3번째 점을 누르면 배너가 3번째 장으로 바로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['공지 팝업을 닫아 두었다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('공지 팝업이 보이지 않는다', await 홈.공지팝업보이나(), false, { blocker: true });
  });

  await test.step('배너 아래 3번째 점을 누른다', async () => {
    await 홈.배너점(3).click();
    await verify(
      '3번째 점을 누르면 배너가 3번째 장으로 바로 간다',
      { 점: await 홈.배너장이자리잡았나(3), 현재: await 홈.현재배너번호() },
      { 점: true, 현재: 3 },
    );
  });
});
