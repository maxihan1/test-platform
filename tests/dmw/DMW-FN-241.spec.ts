import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기, 시험배송정보 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-241',
  name: '「② 결제 수단」에서 「이전」을 누르면 적어 둔 받는 분이 남아 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    받는분: z.string().describe('받는 분 이름 — 공백이 아닌 글자 1자 이상').default('홍길동'),
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
    await test.step('② 결제 수단에서 「이전」을 누른다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      await 주문서.결제수단으로넘어가기({ ...시험배송정보(), 받는분: params.받는분 });
      await verify('「② 결제 수단」이 보인다', await 주문서.단계글(), '② 결제 수단', { blocker: true });
      await 주문서.이전.click();
      await verify('「② 결제 수단」에서 「이전」을 누르면 적어 둔 받는 분이 남아 있다', await 주문서.받는분.inputValue(), params.받는분);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
