import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-002',
  name: '상품 목록 화면에서 로고 「데모마켓」을 누르면 홈 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 제목 = new 화면제목(page);
  await 안내창막기(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await page.goto('/shop');
    await 홈.머리.그려질때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('상품 목록 화면이 보인다', await 제목.글('쇼핑').isVisible(), true, { blocker: true });
  });

  await test.step('상품 목록 화면에서 머리글 로고 「데모마켓」을 누른다', async () => {
    await 홈.머리.로고.click();
    await 홈.그려질때까지();
    await verify('상품 목록 화면에서 로고 「데모마켓」을 누르면 홈 화면이 보인다', await 홈.추천제목.isVisible(), true);
  });
});
