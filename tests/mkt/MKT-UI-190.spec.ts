import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품문의 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-190',
  name: '상품 문의 질문을 누르면 그 아래에 답변이 펼쳐진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 상품 문의가 하나 이상 있는 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 문의 = (await 상품문의(page.request, params.productId))[0];
  if (!문의) throw new Error('상품 문의가 없는 상품이다');
  const 질문 = 상세.질문(문의.question);
  const 답변 = 상세.답변(문의.answer);

  await test.step('「상품 문의」 탭의 첫 질문을 누른다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await 상세.문의탭.click();
    await 상세.문의패널.waitFor();
    await verify('상품 문의 탭이 열려 있다', await 상세.문의패널.isVisible(), true, { blocker: true });
    await 질문.click();
    await 답변.waitFor();
    await verify('상품 문의 질문을 누르면 그 아래에 답변이 펼쳐진다', (await 상세.아래에펼쳐졌나(질문, 답변)) ? '아래에 펼쳐짐' : '안 펼쳐짐', '아래에 펼쳐짐');
  });

  await test.step('펼친 질문을 다시 누른다', async () => {
    await 질문.click();
    await 답변.waitFor({ state: 'hidden' });
    await verify('펼친 상품 문의 질문을 다시 누르면 답변이 접힌다', await 답변.isVisible(), false);
  });
});
