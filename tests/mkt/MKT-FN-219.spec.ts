import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-219',
  name: '조건에 맞는 상품이 0개면 「조건에 맞는 상품이 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    emptyPrice: z.number().describe('조건에 맞는 상품이 없게 되는 최대 가격(원) — 0').default(0),
    category: z.string().describe('상품이 있는 카테고리 — 패션, 전자기기, 도서, 식품 중 하나').default('도서'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('최대 가격 0원에 「품절 상품 제외」를 켠다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.최대가격정하기(params.emptyPrice);
    await 목록.품절제외.check();
    await 목록.목록다시나올때까지();
    await verify('조건에 맞는 상품이 0개면 「조건에 맞는 상품이 없습니다」가 보인다', await 목록.결과없음.isVisible(), true);
  });

  await test.step('카테고리 「도서」만 켠다', async () => {
    await 목록.열기();
    await 목록.카테고리(params.category).check();
    await 목록.목록다시나올때까지();
    await verify('조건에 맞는 상품이 1개 이상이면 「조건에 맞는 상품이 없습니다」가 보이지 않는다', await 목록.결과없음.isVisible(), false);
  });
});
