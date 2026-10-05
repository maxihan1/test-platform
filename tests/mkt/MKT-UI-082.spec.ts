import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-082',
  name: '「품절 상품 제외」 스위치가 처음에 꺼져 있다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 목록을 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('「품절 상품 제외」 스위치가 처음에 꺼져 있다', await 목록.품절제외스위치.isChecked(), false);
  });

  await test.step('상품 목록을 품절 상품이 나올 때까지 내린다', async () => {
    await 목록.끝까지내리기();
    await 목록.품절카드.first().waitFor();
    await verify('품절 상품 카드에 회색 덮개와 「품절」 표시가 보인다', await 목록.품절덮개가회색이고품절표시가있나(목록.품절카드.first()), true);
  });
});
