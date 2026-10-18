import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 사라졌나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-055',
  name: '이벤트 띠의 X 를 누르면 띠가 사라진다',
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

  await test.step('이벤트 띠의 X 를 누른다', async () => {
    await 홈.이벤트띠글.waitFor();
    await 홈.이벤트띠닫기.click();
    await verify('이벤트 띠의 X 를 누르면 띠가 사라진다', await 사라졌나(홈.이벤트띠), true);
  });
});
