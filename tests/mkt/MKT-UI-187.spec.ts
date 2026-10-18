import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-187',
  name: '품절 상품 상세에는 「장바구니 담기」 · 「바로 구매」 대신 눌리지 않는 「품절」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    soldOutId: z.number().describe('열어 볼 품절 상품 번호 — 목록에 품절 표시가 있는 상품').default(7),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('품절 상품 상세를 연다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.soldOutId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    const 품절 = (await 상세.품절버튼.isVisible()) && (await 상세.품절버튼.isDisabled()) ? '품절(눌리지 않음)' : '품절 버튼 없음';
    const 담기 = (await 상세.담기.count()) === 0 ? '담기 없음' : '담기 있음';
    const 구매 = (await 상세.바로구매.count()) === 0 ? '바로 구매 없음' : '바로 구매 있음';
    await verify('품절 상품 상세에는 「장바구니 담기」 · 「바로 구매」 대신 눌리지 않는 「품절」 버튼이 보인다', [품절, 담기, 구매].join(', '), '품절(눌리지 않음), 담기 없음, 바로 구매 없음');
  });
});
