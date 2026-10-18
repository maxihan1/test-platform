import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-053',
  name: '홈에 다시 들어오면 추천 상품 순서가 앞과 다르다',
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

  await test.step('홈 화면을 두 번 열어 추천 상품 순서를 견준다', async () => {
    const 처음 = await 홈.추천카드이름들();
    await 홈.열기();
    const 다시 = await 홈.추천카드이름들();
    await verify('홈에 다시 들어오면 추천 상품 순서가 앞과 다르다', 처음.join(', ') !== 다시.join(', '), true);
  });
});
