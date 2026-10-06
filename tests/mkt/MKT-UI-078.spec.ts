import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-078',
  name: '상품 목록에 상품 카드가 한 줄에 4개씩 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '화면 너비가 768px 이다'],
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
    await verify('상품 목록에 상품 카드가 한 줄에 4개씩 보인다', await 목록.첫줄카드수(), 4);
    await verify('상품 카드에 이미지 · 상품명 · 가격 · 할인율 · 별점이 보인다', await 목록.카드조각이모두보이나(목록.할인카드()), true);
    await verify('할인 상품 카드의 원래 가격에 가운데 줄이 그어져 보인다', await 목록.원래가격에가운데줄이있나(목록.할인카드()), true);
    await verify('할인 상품 카드의 할인 가격이 빨간 글자로 보인다', await 목록.할인가격이빨간가(목록.할인카드()), true);
  });

  await test.step('너비 768px 로 상품 목록을 연다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 목록.열기();
    await 목록.첫화면기다리기();
    await verify('너비 768px 상품 목록에는 상품 카드가 한 줄에 2개씩 보인다', await 목록.첫줄카드수(), 2);
  });
});
