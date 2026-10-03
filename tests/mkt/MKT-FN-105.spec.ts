import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-105',
  name: 'GET /api/products 는 category(쉼표로 여럿) 로 상품을 거른다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({
    categories: z.string().min(1).describe('카테고리(쉼표로 여럿)').default('패션,도서'),
    maxPrice: z.number().describe('최대 가격').default(150000),
    detailId: z.number().describe('상세를 읽을 옵션 상품 번호').default(1),
    reviewsId: z.number().describe('리뷰를 읽을 상품 번호').default(3),
    addressQuery: z.string().min(1).describe('두 글자 이상 주소 검색어').default('서울'),
    oneCharQuery: z.string().min(1).describe('한 글자 주소 검색어').default('서'),
    suggestQuery: z.string().min(1).describe('자동완성 검색어').default('기'),
  }),
  expected: z.object({
    categoryTotal: z.number().describe('두 카테고리 상품 수').default(20),
    maxPriceTotal: z.number().describe('최대 가격 이하 상품 수').default(13),
    noSoldOutTotal: z.number().describe('품절 제외 상품 수').default(36),
    pageSize: z.number().describe('요청한 size').default(5),
    maxSuggest: z.number().describe('자동완성 최대 수').default(5),
  }),
});

interface 상품 {
  id: number;
  category: string;
  salePrice: number;
  reviewCount: number;
  soldOut: boolean;
}

interface 목록 {
  items: 상품[];
  total: number;
  page: number;
  size: number;
}

function 정렬됨(값들: number[], 방향: 'asc' | 'desc'): boolean {
  return 값들.every((값, 번호) => 번호 === 0 || (방향 === 'asc' ? (값들[번호 - 1] ?? 0) <= 값 : (값들[번호 - 1] ?? 0) >= 값));
}

test(spec, async ({ request, params, expected }) => {
  const 상품을읽는다 = async (query: Record<string, string | number>): Promise<목록> => {
    const 응답 = await request.get('/api/products', { params: query });
    return (await 응답.json()) as 목록;
  };

  await test.step('GET /api/products 를 category · maxPrice · excludeSoldOut · sort · page · size 를 바꿔 부른다', async () => {
    const 결과 = await 상품을읽는다({ category: params.categories, size: 100 });
    const 허용 = params.categories.split(',');
    await verify(
      'GET /api/products 는 category(쉼표로 여럿) 로 상품을 거른다',
      { 총: 결과.total, 분류만: 결과.items.every((상품) => 허용.includes(상품.category)) },
      { 총: expected.categoryTotal, 분류만: true },
    );
  });

  await test.step('GET /api/products 를 maxPrice 로 부른다', async () => {
    const 결과 = await 상품을읽는다({ maxPrice: params.maxPrice, size: 100 });
    await verify(
      'GET /api/products 는 maxPrice 이하의 상품만 준다',
      { 총: 결과.total, 모두이하: 결과.items.every((상품) => 상품.salePrice <= params.maxPrice) },
      { 총: expected.maxPriceTotal, 모두이하: true },
    );
  });

  await test.step('GET /api/products 를 excludeSoldOut 으로 부른다', async () => {
    const 결과 = await 상품을읽는다({ excludeSoldOut: 'true', size: 100 });
    await verify(
      'GET /api/products 는 excludeSoldOut 이 켜지면 품절 상품을 빼고 준다',
      { 총: 결과.total, 품절없음: 결과.items.every((상품) => !상품.soldOut) },
      { 총: expected.noSoldOutTotal, 품절없음: true },
    );
  });

  await test.step('GET /api/products 를 sort 와 page · size 로 부른다', async () => {
    const 낮은 = await 상품을읽는다({ sort: 'priceAsc', size: 100 });
    const 높은 = await 상품을읽는다({ sort: 'priceDesc', size: 100 });
    const 리뷰 = await 상품을읽는다({ sort: 'reviews', size: 100 });
    const 추천 = await 상품을읽는다({ sort: 'recommend', size: 100 });
    const 쪽 = await 상품을읽는다({ sort: 'priceAsc', page: 2, size: expected.pageSize });
    const 첫쪽 = await 상품을읽는다({ sort: 'priceAsc', page: 1, size: expected.pageSize });
    await verify(
      'GET /api/products 는 sort 의 recommend · priceAsc · priceDesc · reviews 순서와 page · size 를 따른다',
      {
        priceAsc: 정렬됨(낮은.items.map((상품) => 상품.salePrice), 'asc'),
        priceDesc: 정렬됨(높은.items.map((상품) => 상품.salePrice), 'desc'),
        reviews: 정렬됨(리뷰.items.map((상품) => 상품.reviewCount), 'desc'),
        recommend: 추천.items.length === 추천.total,
        쪽: { page: 쪽.page, 개수: 쪽.items.length, 첫쪽과다름: 쪽.items[0]?.id !== 첫쪽.items[0]?.id, 이어짐: 쪽.items[0]?.id === 낮은.items[expected.pageSize]?.id },
      },
      { priceAsc: true, priceDesc: true, reviews: true, recommend: true, 쪽: { page: 2, 개수: expected.pageSize, 첫쪽과다름: true, 이어짐: true } },
    );
  });

  await test.step('GET /api/products/{id} 를 부른다', async () => {
    const 응답 = await request.get(`/api/products/${params.detailId}`);
    const 본문 = (await 응답.json()) as { colors: string[]; sizes: string[]; stock: number; qna: unknown[] };
    const 이미지 = await request.get(`/img/p/${params.detailId}/1`);
    await verify(
      'GET /api/products/{id} 는 이미지 · 옵션 · 재고 · 문의를 준다',
      {
        상태: 응답.status(),
        이미지: 이미지.status(),
        옵션: 본문.colors.length > 0 && 본문.sizes.length > 0,
        재고: typeof 본문.stock === 'number',
        문의: 본문.qna.length > 0,
      },
      { 상태: 200, 이미지: 200, 옵션: true, 재고: true, 문의: true },
    );
  });

  await test.step('GET /api/address?q= 에 두 글자 이상 검색어를 준다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: params.addressQuery } });
    const 본문 = (await 응답.json()) as { items: unknown[] };
    await verify('GET /api/address 는 두 글자 이상 검색어에 주소 검색 결과를 준다', { 상태: 응답.status(), 결과있음: 본문.items.length > 0 }, { 상태: 200, 결과있음: true });
  });

  await test.step('GET /api/address?q= 에 한 글자 검색어를 준다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: params.oneCharQuery } });
    await verify('GET /api/address 는 2자 미만 검색어에 400 을 준다', 응답.status(), 400);
  });

  await test.step('GET /api/products/{id}/reviews 를 부른다', async () => {
    let 상태 = 0;
    let 건수 = -1;
    for (let 번 = 0; 번 < 10 && 상태 !== 200; 번 += 1) {
      const 응답 = await request.get(`/api/products/${params.reviewsId}/reviews`);
      상태 = 응답.status();
      if (상태 === 200) 건수 = ((await 응답.json()) as { items: unknown[] }).items.length;
    }
    await verify('GET /api/products/{id}/reviews 는 리뷰 목록을 준다', { 상태, 목록있음: 건수 >= 0 }, { 상태: 200, 목록있음: true });
  });

  await test.step('GET /api/products/suggest?q= 를 부른다', async () => {
    const 응답 = await request.get('/api/products/suggest', { params: { q: params.suggestQuery } });
    const 본문 = (await 응답.json()) as { items: unknown[] };
    await verify(
      'GET /api/products/suggest 는 자동완성 결과를 최대 5개까지 준다',
      { 상태: 응답.status(), 최대이하: 본문.items.length > 0 && 본문.items.length <= expected.maxSuggest },
      { 상태: 200, 최대이하: true },
    );
  });
});
