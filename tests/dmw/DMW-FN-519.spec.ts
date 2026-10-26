import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 글자 } from './helpers/common-tools.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-519',
  name: '요청 사항 직접 입력 칸에 50자를 적으면 50자가 다 들어간다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    쉰자: z.number().describe('요청 사항 직접 입력 칸에 적는 글자 수 — 1~50자').default(50),
    쉰한자: z.number().describe('요청 사항 직접 입력 칸에 적는 글자 수 — 51자 이상').default(51),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 줄 = await 상품담기(page.request, 상품, 1);

  try {
    await test.step('요청 사항 직접 입력 칸에 50자를 적는다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.배송요청.selectOption({ label: '직접 입력' });
      await 주문서.직접입력칸.fill(글자(params.쉰자));
      await verify('요청 사항 직접 입력 칸에 50자를 적으면 50자가 다 들어간다', (await 주문서.직접입력칸.inputValue()).length, params.쉰자);
    });
    await test.step('요청 사항 직접 입력 칸에 51자를 적는다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.배송요청.selectOption({ label: '직접 입력' });
      await 주문서.직접입력칸.fill(글자(params.쉰한자));
      await verify('요청 사항 직접 입력 칸에 51자를 적으면 50자까지만 들어간다', (await 주문서.직접입력칸.inputValue()).length, 50);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
