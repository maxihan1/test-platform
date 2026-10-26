import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-517',
  name: '연락처 칸에 「010-1234-5678」을 적으면 숫자 「01012345678」만 들어간다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    연락처글: z.string().describe('연락처 칸에 적는 글 — 숫자 사이에 하이픈이 낀 11자리 번호').default('010-1234-5678'),
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
    await test.step('연락처 칸에 「010-1234-5678」을 적는다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.연락처.fill(params.연락처글);
      await verify('연락처 칸에 「010-1234-5678」을 적으면 숫자 「01012345678」만 들어간다', await 주문서.연락처.inputValue(), params.연락처글.replace(/\D/g, ''));
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
