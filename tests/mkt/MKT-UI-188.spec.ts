import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-188',
  name: '상품 상세 아래에 「상품 설명」 · 「리뷰 (N)」 · 「상품 문의」 탭이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('상품 상세 아래 탭을 확인한다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    const 탭글 = (await 상세.탭들.allInnerTexts()).map((글) => 글.replace(/\(\d+\)/, '(N)'));
    await verify('상품 상세 아래에 「상품 설명」 · 「리뷰 (N)」 · 「상품 문의」 탭이 보인다', 탭글.join(' · '), '상품 설명 · 리뷰 (N) · 상품 문의');
  });
});
