import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

type 상품요약 = { name: string; category: string };

export const spec = defineCase({
  tcId: 'MKT-FN-065',
  name: '카테고리를 여러 개 고르면 고른 카테고리의 상품만 보이고 모두 해제하면 전체 상품이 보인다',
  precondition: ['비회원이다', '카테고리를 고른 상태다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 전체 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 고른분류 = ['패션', '도서'];
  const 고른이름들 = 전체.filter((상품) => 고른분류.includes(상품.category)).map((상품) => 상품.name).sort();
  const 전체이름들 = 전체.map((상품) => 상품.name).sort();

  await test.step('카테고리 「패션」과 「도서」를 고른다', async () => {
    await 목록.열기();
    await 목록.상품카드들().first().waitFor();
    await 머리.장바구니링크().waitFor();
    await verify('비회원이다', await 머리.로그인링크().isVisible(), true, { blocker: true });
    await 목록.카테고리체크('패션').check();
    await 목록.카테고리체크('도서').check();
    await 목록.상품카드들().first().waitFor();
    await 목록.끝까지내리기(고른이름들.length);
    await verify('카테고리를 여러 개 고르면 고른 카테고리의 상품만 보인다', (await 목록.카드이름들().allInnerTexts()).sort(), 고른이름들);
  });

  await test.step('고른 카테고리를 모두 해제한다', async () => {
    await verify(
      '카테고리를 고른 상태다',
      [await 목록.카테고리체크('패션').isChecked(), await 목록.카테고리체크('도서').isChecked()],
      [true, true],
      { blocker: true },
    );
    await 목록.카테고리체크('패션').uncheck();
    await 목록.카테고리체크('도서').uncheck();
    await 목록.상품카드들().first().waitFor();
    await 목록.끝까지내리기(전체이름들.length);
    await verify('카테고리를 아무것도 고르지 않으면 전체 상품이 보인다', (await 목록.카드이름들().allInnerTexts()).sort(), 전체이름들);
  });
});
