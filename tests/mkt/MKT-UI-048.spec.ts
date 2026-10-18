import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-048',
  name: '「추천 상품 다음」을 누르면 추천 상품 줄이 옆으로 넘어간다',
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

  await test.step('「추천 상품 다음」을 누른다', async () => {
    const 앞 = await 홈.추천줄가로위치();
    await 홈.추천다음.click();
    await 홈.추천줄멈출때까지();
    await verify('「추천 상품 다음」을 누르면 추천 상품 줄이 옆으로 넘어간다', (await 홈.추천줄가로위치()) > 앞, true);
  });
});
