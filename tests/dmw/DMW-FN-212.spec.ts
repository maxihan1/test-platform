import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-212',
  name: '수량을 3으로 올리면 「총 상품 금액」이 상품 가격의 3배로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    수량: z.number().describe('올릴 수량 — 2~10개').default(3),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);

  await test.step('수량을 3으로 올린다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    await 상세.수량두기(params.수량);
    await verify('수량을 3으로 올리면 「총 상품 금액」이 상품 가격의 3배로 바뀐다', await 상세.총금액읽기(), 상품.salePrice * params.수량);
  });
});
