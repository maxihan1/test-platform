import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-156',
  name: '상품 목록이 정해진 시간 안에 다 뜬다',
  precondition: ['비회원이다'],
  params: null,
  expected: z.object({
    기준시간: z.number().describe('기준 시간(초)'),
  }),
  held: '판정 불가 — 「적당히 빠르게」의 시간 기준이 기획서에 없다',
});

test(spec, async ({ page, expected }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 목록을 연다', async () => {
    const 시작 = Date.now();
    await 목록.열기();
    await 목록.카드들.nth(11).waitFor();
    const 걸린초 = (Date.now() - 시작) / 1000;
    await verify('상품 목록이 정해진 시간 안에 다 뜬다', 걸린초 <= expected.기준시간, true);
  });
});
