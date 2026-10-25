import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-510',
  name: '없는 상품 번호로 상품 상세를 열면 화면이 깨지지 않고 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  await 안내창막기(page);

  await test.step('없는 상품 번호로 상품 상세를 연다', async () => {
    await 상세.열기(999999);
    await verify('상품 상세 화면이 열렸다', await 상세.제목.isVisible(), true, { blocker: true });
    const 안내 = await verify('안내 글이 보인다', (await 상세.제목.innerText()).length > 0, true);
    const 돌아가기 = await verify('「쇼핑으로」 링크가 보인다', await 상세.쇼핑으로.isVisible(), true);
    await verify('없는 상품 번호로 상품 상세를 열면 화면이 깨지지 않고 안내가 보인다', 안내 && 돌아가기, true);
  });
});
