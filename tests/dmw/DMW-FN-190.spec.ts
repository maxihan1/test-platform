import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 전체상품이름들 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-190',
  name: '최대 가격을 0원으로 두면 상품이 한 건도 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: z.object({
    낮은값: z.number().describe('최대 가격 — 상품이 한 건도 없는 0원 또는 10,000원').default(0),
    높은값: z.number().describe('최대 가격 — 모든 상품이 들어오는 390,000~500,000원, 10,000원 단위').default(500000),
    넘는값: z.number().describe('슬라이더 끝을 넘으려는 최대 가격 — 500,001원 이상').default(500001),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 목록 = new 상품목록화면(page);
  const 전체수 = (await 전체상품이름들(request)).length;
  await 안내창막기(page);

  await test.step('가격 슬라이더를 0원으로 둔다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.최대가격두기(params.낮은값);
    await 목록.빈상태.waitFor();
    await verify('최대 가격을 0원으로 두면 상품이 한 건도 보이지 않는다', await 목록.카드수(), 0);
  });

  await test.step('가격 슬라이더를 500,000원으로 둔다', async () => {
    await 목록.최대가격두기(params.높은값);
    await 목록.카드들.first().waitFor();
    await 목록.끝까지내리기();
    await verify('최대 가격을 500,000원으로 두면 모든 상품이 보인다', await 목록.카드수(), 전체수);
  });

  await test.step('가격 슬라이더를 500,001원으로 두려 한다', async () => {
    await 목록.최대가격억지로두기(params.넘는값);
    await verify('가격 슬라이더는 500,001원으로 갈 수 없고 500,000원에 머문다', await 목록.최대가격읽기(), 500000);
  });
});
