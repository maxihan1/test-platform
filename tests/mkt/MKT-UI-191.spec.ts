import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품문의 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-191',
  name: '상품 문의는 질문 둘의 답변이 함께 펼쳐진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['상품 문의가 둘 이상인 상품 상세가 열려 있다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 상품 문의가 둘 이상 있는 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 문의들 = await 상품문의(page.request, params.productId);
  const 첫째 = 문의들[0];
  const 둘째 = 문의들[1];
  if (!첫째 || !둘째) throw new Error('상품 문의가 둘 이상 없는 상품이다');

  await test.step('상품 상세를 열고 「상품 문의」 탭을 누른다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await 상세.문의탭.click();
    await 상세.문의패널.waitFor();
  });

  await test.step('상품 문의 질문이 둘 이상 보이는지 확인한다', async () => {
    await verify('상품 문의가 둘 이상인 상품 상세가 열려 있다', (await 상세.질문(첫째.question).isVisible()) && (await 상세.질문(둘째.question).isVisible()), true, { blocker: true });
  });

  await test.step('상품 문의 질문 둘을 차례로 누른다', async () => {
    await 상세.질문(첫째.question).click();
    await 상세.질문(둘째.question).click();
    await 상세.답변(둘째.answer).waitFor();
    await verify('상품 문의는 질문 둘의 답변이 함께 펼쳐진다', [await 상세.답변(첫째.answer).isVisible(), await 상세.답변(둘째.answer).isVisible()], [true, true]);
  });
});
