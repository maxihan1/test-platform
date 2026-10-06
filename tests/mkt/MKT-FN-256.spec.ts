import { defineCase, test, verify } from '@platform/kit';

import { 상품목록응답붙잡기 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-256',
  name: '상품 목록을 불러오는 동안 회색 빈 카드 12개가 먼저 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '상품 목록 응답은 늦춘 응답이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 붙잡음 = await 상품목록응답붙잡기(page);

  try {
    await test.step('상품 목록 응답을 붙잡아 둔 채 상품 목록을 연다', async () => {
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 목록.열기();
      await 목록.빈카드.first().waitFor();
      await 머리.로그인링크.waitFor();
      await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await verify('상품 목록을 불러오는 동안 회색 빈 카드 12개가 먼저 보인다', await 목록.빈카드.count(), 12);
    });

    await test.step('붙잡아 둔 상품 목록 응답을 보낸다', async () => {
      await 붙잡음.보내기();
      await 목록.카드.first().waitFor();
      await verify('불러오면 빈 카드가 실제 상품 카드로 바뀐다', await 목록.빈카드.count(), 0);
    });
  } finally {
    await 붙잡음.풀기();
  }
});
