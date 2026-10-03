import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

type 상품요약 = { name: string; price: number; salePrice: number; discountRate: number; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-UI-023',
  name: '상품 목록에 한 줄 4개씩 놓인 카드의 이미지 · 상품명 · 가격 · 별점 · 할인 · 품절 표시가 보인다',
  precondition: ['상품이 12개 이상 있다', '할인 상품이 있다', '품절 상품이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 머리 = new 머리글(page);
  const 응답 = (await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[]; total: number };
  const 할인상품 = 응답.items.find((상품) => 상품.discountRate > 0);
  const 품절상품 = 응답.items.find((상품) => 상품.soldOut);
  const 원 = (금액: number): string => `${금액.toLocaleString('ko-KR')}원`;
  const 색숫자 = (색: string): number[] => (색.match(/[\d.]+/g) ?? []).map(Number);
  const 빨간가 = (색: string): boolean => {
    const [빨강 = 0, 초록 = 255, 파랑 = 255] = 색숫자(색);
    return 빨강 >= 180 && 초록 <= 100 && 파랑 <= 100;
  };
  const 회색인가 = (색: string): boolean => {
    const [빨강 = 0, 초록 = 0, 파랑 = 0, 투명도 = 1] = 색숫자(색);
    return 투명도 > 0 && Math.max(빨강, 초록, 파랑) - Math.min(빨강, 초록, 파랑) <= 30;
  };

  await test.step('상품 목록 화면을 연다', async () => {
    await 목록.열기();
    await 목록.상품카드들().first().waitFor();
    await 머리.장바구니링크().waitFor();
    await verify('상품이 12개 이상 있다', (await 목록.상품카드들().count()) >= 12, true, { blocker: true });
    await verify('할인 상품이 있다', 할인상품 !== undefined, true, { blocker: true });
    await verify('품절 상품이 있다', 품절상품 !== undefined, true, { blocker: true });
    const 할인 = 할인상품 as 상품요약;
    const 품절 = 품절상품 as 상품요약;
    await verify(
      '상품 카드에 이미지 · 상품명 · 가격 · 별점이 보인다',
      [
        await 목록.카드이미지(할인.name).isVisible(),
        await 목록.카드글자(할인.name, 할인.name).isVisible(),
        await 목록.카드글자(할인.name, 원(할인.salePrice)).isVisible(),
        await 목록.카드별점(할인.name).isVisible(),
      ],
      [true, true, true, true],
    );
    const 줄별개수: Record<number, number> = {};
    for (const 위치 of await 목록.카드세로위치들()) 줄별개수[위치] = (줄별개수[위치] ?? 0) + 1;
    await verify('상품 카드가 한 줄에 4개씩 보인다', Object.values(줄별개수), [4, 4, 4]);
    await verify(
      '할인 상품은 원래 가격에 가운데 줄이 그어지고 할인율과 할인 가격이 빨갛게 보인다',
      [
        await 목록.카드글자줄긋기(할인.name, 원(할인.price)),
        빨간가(await 목록.카드글자색(할인.name, `${할인.discountRate}%`)),
        빨간가(await 목록.카드글자색(할인.name, 원(할인.salePrice))),
      ],
      ['line-through', true, true],
    );
    await 목록.끝까지내리기(응답.total);
    await verify(
      '품절 상품 카드에 회색 덮개와 「품절」 표시가 보인다',
      [await 목록.카드덮개글자(품절.name), 회색인가(await 목록.카드덮개배경색(품절.name))],
      ['"품절"', true],
    );
  });
});
