import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-072',
  name: '불러올 상품이 남아 있으면 「마지막 상품입니다」 가 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('불러올 상품이 남은 채 목록 중간까지 내린다', async () => {
    await 목록.한번내리기();
    await 목록.카드.nth(23).waitFor();
    await verify('불러올 상품이 남아 있으면 「마지막 상품입니다」 가 보이지 않는다', await 목록.끝문구.isVisible(), false);
  });

  await test.step('더 불러올 상품이 없을 때까지 목록을 내린다', async () => {
    await 목록.끝까지내리기();
    await verify('더 불러올 상품이 없으면 「마지막 상품입니다」 가 보인다', await 목록.끝문구.isVisible(), true);
  });
});
