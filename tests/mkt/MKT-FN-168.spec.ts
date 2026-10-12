import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-168',
  name: '없는 상품 번호로 상세를 열면 「상품을 찾을 수 없습니다」와 「쇼핑으로」 링크가 보인다',
  techniques: ['오류 추정'],
  precondition: ['비회원이다'],
  params: z.object({
    missingProductId: z.number().int().describe('열어 볼 없는 상품 번호 — 그 서버에 없는 번호').default(999999),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('없는 상품 번호로 상세를 연다', async () => {
    await 상세.열기(params.missingProductId);
    await 상세.불러오기끝나기를기다리기();
    await verify('없는 상품 번호로 상세를 열면 「상품을 찾을 수 없습니다」와 「쇼핑으로」 링크가 보인다', [await 상세.못찾음제목.isVisible(), await 상세.쇼핑으로.isVisible()], [true, true]);
  });
});
