import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-024',
  name: '상품 목록의 왼쪽 필터에 카테고리 · 가격 슬라이더 · 품절 상품 제외 스위치가 보이고 정렬은 「추천순」이 기본이다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('상품 목록 화면을 연다', async () => {
    await 목록.열기();
    await 목록.상품카드들().first().waitFor();
    await verify(
      '왼쪽 필터에 카테고리 체크박스 「패션」 「전자기기」 「도서」 「식품」이 보인다',
      [
        await 목록.카테고리체크('패션').isVisible(),
        await 목록.카테고리체크('전자기기').isVisible(),
        await 목록.카테고리체크('도서').isVisible(),
        await 목록.카테고리체크('식품').isVisible(),
      ],
      [true, true, true, true],
    );
    await verify(
      '가격 범위 슬라이더가 0원에서 500,000원까지 10,000원 단위로 보인다',
      [
        await 목록.가격슬라이더().isVisible(),
        await 목록.가격슬라이더속성('min'),
        await 목록.가격슬라이더속성('max'),
        await 목록.가격슬라이더속성('step'),
      ],
      [true, '0', '500000', '10000'],
    );
    await verify(
      '「품절 상품 제외」 스위치가 꺼진 채 보인다',
      [await 목록.품절제외스위치().isVisible(), await 목록.품절제외스위치().isChecked()],
      [true, false],
    );
    await verify(
      '정렬 선택 상자에 「추천순」 「낮은 가격순」 「높은 가격순」 「리뷰 많은순」이 있고 「추천순」이 기본이다',
      [await 목록.정렬선택지().allInnerTexts(), await 목록.선택된정렬().innerText()],
      [['추천순', '낮은 가격순', '높은 가격순', '리뷰 많은순'], '추천순'],
    );
  });
});
