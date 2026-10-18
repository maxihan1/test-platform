import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-174',
  name: '두 번째 썸네일에 마우스를 올리면 큰 이미지가 그 이미지로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('두 번째 썸네일에 마우스를 올린다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await verify('상품 상세 화면 상품명이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    await 상세.썸네일(2).hover();
    await 상세.선택된썸네일일때까지(2);
    await verify('두 번째 썸네일에 마우스를 올리면 큰 이미지가 그 이미지로 바뀐다', await 상세.큰이미지.getAttribute('src'), await 상세.썸네일그림(2).getAttribute('src'));
  });

  await test.step('세 번째 썸네일을 누른다', async () => {
    await 상세.썸네일(3).click();
    await 상세.선택된썸네일일때까지(3);
    await verify('세 번째 썸네일을 누르면 큰 이미지가 그 이미지로 바뀐다', await 상세.큰이미지.getAttribute('src'), await 상세.썸네일그림(3).getAttribute('src'));
  });
});
