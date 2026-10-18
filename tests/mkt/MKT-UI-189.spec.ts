import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-189',
  name: '상품 상세 탭을 누르면 내용만 바뀌고 주소는 그대로다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('「상품 문의」 탭을 누른다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    const 처음주소 = page.url();
    await 상세.문의탭.click();
    await 상세.문의패널.waitFor();
    const 내용 = (await 상세.문의패널.isVisible()) ? '내용 바뀜' : '내용 그대로';
    const 주소 = page.url() === 처음주소 ? '주소 그대로' : '주소 바뀜';
    await verify('상품 상세 탭을 누르면 내용만 바뀌고 주소는 그대로다', `${내용}, ${주소}`, '내용 바뀜, 주소 그대로');
  });
});
