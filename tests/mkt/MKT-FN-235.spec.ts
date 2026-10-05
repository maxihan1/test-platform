import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-235',
  name: '상품 목록 끝까지 내리면 다음 12개를 불러와 카드가 24개 보인다',
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
    await 목록.카드.nth(11).waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 목록을 끝까지 한 번 내린다', async () => {
    await 목록.한번내리기();
    await 목록.카드.nth(23).waitFor();
    await verify('상품 목록 끝까지 내리면 다음 12개를 불러와 카드가 24개 보인다', await 목록.카드.count(), 24);
  });
});
