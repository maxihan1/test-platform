import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-529',
  name: '없는 상품 번호로 상품 상세를 열면 「상품을 찾을 수 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['오류 추정'],
  params: z.object({
    missingId: z.number().describe('없는 상품 번호 — 상품이 하나도 없는 번호').default(999),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이라 세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('없는 상품 번호 「999」로 상품 상세를 연다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.missingId);
    await verify('없는 상품 번호로 상품 상세를 열면 「상품을 찾을 수 없습니다」가 보인다', await 상세.없는상품문구.isVisible(), true);
  });
});
