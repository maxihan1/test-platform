import { defineCase, test, verify } from '@platform/kit';

type 상품요약 = { id: number; category: string; salePrice: number; soldOut: boolean };
type 상품상세 = { colors: string[]; sizes: string[]; stock: number; qna: unknown[] };

export const spec = defineCase({
  tcId: 'MKT-FN-097',
  name: '상품 API 는 조건에 맞는 목록 · 상세 · 리뷰를 돌려주고 자동완성은 최대 5개만 돌려준다',
  precondition: ['비회원이다'],
  unconfirmed: '기획서와 다름 — 차이 D4: 상품 상세 응답에 이미지 칸이 없고 이미지는 /img/p/{상품 번호}/{1~4} 주소로 따로 받는다 (작성 요청 5873)',
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 목록주소 = `/api/products?category=${encodeURIComponent('패션,식품')}&maxPrice=100000&excludeSoldOut=true&sort=priceAsc&page=1&size=5`;
  let 상품번호 = 0;

  await test.step('상품 목록 API 를 category · maxPrice · excludeSoldOut · sort · page · size 로 부른다', async () => {
    const 상품들 = ((await (await request.get(목록주소)).json()) as { items: 상품요약[] }).items;
    상품번호 = 상품들[0]?.id ?? 0;
    await verify(
      '상품 목록 API 는 조건에 맞는 상품만 돌려준다',
      [
        상품들.length > 0,
        상품들.length <= 5,
        상품들.every((상품) => ['패션', '식품'].includes(상품.category)),
        상품들.every((상품) => 상품.salePrice <= 100000),
        상품들.every((상품) => !상품.soldOut),
        상품들.every((상품, 순서) => 순서 === 0 || (상품들[순서 - 1]?.salePrice ?? 0) <= 상품.salePrice),
      ],
      [true, true, true, true, true, true],
    );
  });

  await test.step('상품 상세 API 를 부른다', async () => {
    const 응답 = await request.get(`/api/products/${상품번호}`);
    const 상세 = (await 응답.json()) as 상품상세;
    const 이미지 = await request.get(`/img/p/${상품번호}/1`);
    await verify(
      '상품 상세 API 는 옵션 · 재고 · 문의를 담아 돌려주고 이미지는 이미지 주소로 따로 준다',
      [응답.status(), Array.isArray(상세.colors), Array.isArray(상세.sizes), typeof 상세.stock, Array.isArray(상세.qna), 이미지.status()],
      [200, true, true, 'number', true, 200],
    );
  });

  await test.step('상품 리뷰 API 를 부른다', async () => {
    let 상태 = 0;
    let 리뷰들: unknown = null;
    for (let 시도 = 0; 시도 < 5 && 상태 !== 200; 시도 += 1) {
      const 응답 = await request.get(`/api/products/${상품번호}/reviews`);
      상태 = 응답.status();
      if (상태 === 200) 리뷰들 = ((await 응답.json()) as { items: unknown }).items;
    }
    await verify('상품 리뷰 API 는 리뷰 목록을 돌려준다', [상태, Array.isArray(리뷰들)], [200, true]);
  });

  await test.step('자동완성 API 를 글자 하나로 부른다', async () => {
    const 후보들 = ((await (await request.get(`/api/products/suggest?q=${encodeURIComponent('이')}`)).json()) as { items: unknown[] }).items;
    await verify('자동완성 API 는 최대 5개만 돌려준다', [후보들.length > 0, 후보들.length <= 5], [true, true]);
  });
});
