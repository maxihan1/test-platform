import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-047',
  name: '「추천 상품」 8개가 가로 한 줄로 보인다',
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

  await test.step('홈 화면의 「추천 상품」 영역을 확인한다', async () => {
    const 높이들 = await 홈.추천카드높이들();
    await verify(
      '「추천 상품」 8개가 가로 한 줄로 보인다',
      { 개수: 높이들.length, 한줄: new Set(높이들).size === 1 },
      { 개수: 8, 한줄: true },
    );
  });
});
