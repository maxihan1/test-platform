import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-036',
  name: '배너 아래 현재 장의 점만 색이 채워져 있다',
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

  await test.step('배너 아래 점을 확인한다', async () => {
    const 현재 = await 홈.현재배너번호();
    await verify('배너 아래 현재 장의 점만 색이 채워져 있다', await 홈.채워진점번호들(), [현재]);
  });
});
