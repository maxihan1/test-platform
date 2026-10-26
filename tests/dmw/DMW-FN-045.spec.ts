import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-045',
  name: '홈을 다시 열면 추천 상품 순서가 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 여러 번 다시 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    const 순서들 = [(await 홈.추천상품이름들()).join(', ')];
    for (let 번 = 0; 번 < 4; 번 += 1) {
      await page.reload();
      await 홈.그려질때까지();
      순서들.push((await 홈.추천상품이름들()).join(', '));
    }
    await verify('홈을 다시 열면 추천 상품 순서가 바뀐다', new Set(순서들).size > 1, true);
  });
});
