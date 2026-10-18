import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-175',
  name: '큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('큰 이미지를 누른다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    await 상세.큰이미지버튼.click();
    await 상세.확대창.waitFor();
    await verify('큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 뜬다', (await 상세.확대창.isVisible()) && (await 상세.확대창이화면을덮나()), true);
  });
});
