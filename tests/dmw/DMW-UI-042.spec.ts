import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-042',
  name: '추천 상품 카드에 마우스를 올리면 상품 설명 한 줄이 말풍선으로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
  });

  await test.step('추천 상품 카드에 마우스를 올린다', async () => {
    const 카드 = 홈.추천카드들.first();
    await 카드.hover();
    await verify('추천 상품 카드에 마우스를 올리면 상품 설명 한 줄이 말풍선으로 보인다', await 홈.추천툴팁(카드).isVisible(), true);
  });
});
