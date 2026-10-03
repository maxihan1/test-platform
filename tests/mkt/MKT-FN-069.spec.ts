import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

type 상품요약 = { name: string; category: string; salePrice: number; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-069',
  name: '필터를 바꾸면 목록이 처음부터 다시 나오고 「총 {N}개」가 바뀌며 맞는 상품이 없으면 안내가 보인다',
  precondition: ['목록을 끝까지 내려 상품이 더 붙은 상태다', '비회원이다', '어느 상품도 맞지 않는 조건이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 전체 = ((await (await page.request.get('/api/products?page=1&size=100&sort=recommend')).json()) as { items: 상품요약[] }).items;
  const 판매중 = 전체.filter((상품) => !상품.soldOut);
  const 도서판매중수 = 판매중.filter((상품) => 상품.category === '도서').length;

  await test.step('필터를 바꾼다', async () => {
    await 목록.열기();
    await 목록.상품카드들().first().waitFor();
    await 머리.장바구니링크().waitFor();
    await verify('비회원이다', await 머리.로그인링크().isVisible(), true, { blocker: true });
    await 목록.맨아래카드로내리기();
    await 목록.상품카드들().nth(12).waitFor();
    await verify('목록을 끝까지 내려 상품이 더 붙은 상태다', (await 목록.상품카드들().count()) > 12, true, { blocker: true });
    await 목록.품절제외스위치().check();
    await 목록.상품카드들().first().waitFor();
    await verify(
      '필터나 정렬을 바꾸면 목록이 처음부터 다시 나온다',
      await 목록.카드이름들().allInnerTexts(),
      판매중.slice(0, 12).map((상품) => 상품.name),
    );
  });

  await test.step('카테고리 필터를 바꾼다', async () => {
    await 목록.카테고리체크('도서').check();
    await 목록.상품카드들().first().waitFor();
    await verify('필터를 바꾸면 위쪽 「총 {N}개」가 바뀐 상품 수로 갱신된다', await 목록.총개수().innerText(), `총 ${도서판매중수}개`);
  });

  await test.step('가격 슬라이더를 0원으로 맞춘다', async () => {
    await verify('어느 상품도 맞지 않는 조건이다', 전체.every((상품) => 상품.salePrice > 0), true, { blocker: true });
    await 목록.가격맞추기(0);
    await 목록.총개수문구('총 0개').waitFor();
    await verify('조건에 맞는 상품이 없으면 「조건에 맞는 상품이 없습니다」가 보인다', await 목록.빈목록문구().isVisible(), true);
  });
});
