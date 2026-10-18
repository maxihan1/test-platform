import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나 } from './helpers/visual.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-050',
  name: '추천 상품 카드에 마우스를 올리면 상품 설명 말풍선이 보인다',
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

  await test.step('첫 추천 상품 카드에 마우스를 올린다', async () => {
    await 홈.추천카드들.first().hover();
    await verify('추천 상품 카드에 마우스를 올리면 상품 설명 말풍선이 보인다', await 나타났나(홈.추천영역.getByRole('tooltip')), true);
  });
});
