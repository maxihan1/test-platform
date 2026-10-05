import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-236',
  name: '더 불러올 상품이 1개 이상 남아 있으면 「마지막 상품입니다」가 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.카드.nth(11).waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 목록을 끝까지 한 번 내린다', async () => {
    await 목록.한번내리기();
    await 목록.카드.nth(23).waitFor();
    await verify('더 불러올 상품이 1개 이상 남아 있으면 「마지막 상품입니다」가 보이지 않는다', await 목록.마지막안내.isVisible(), false);
  });

  await test.step('더 불러오지 않을 때까지 목록 끝으로 계속 내린다', async () => {
    await 목록.끝까지내리기();
    await verify('더 불러올 상품이 0개면 「마지막 상품입니다」가 보인다', await 목록.마지막안내.isVisible(), true);
  });
});
