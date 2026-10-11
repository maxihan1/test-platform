import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니로주문서열기 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-156',
  name: '요청 사항 직접 입력 칸에 51자를 적으면 50자까지만 들어간다',
  platforms: ['desktop'],
  precondition: ['회원이 장바구니 상품으로 주문서를 열었다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);

  await test.step('회원으로 로그인해 장바구니 상품으로 주문서를 연다', async () => {
    await 장바구니로주문서열기(page, params.loginId ?? '', params.password ?? '');
  });

  await test.step('배송 요청 사항에서 「직접 입력」 을 고른다', async () => {
    await verify('주문서 「① 배송 정보」 단계가 보인다', await 주문서.지금단계.innerText(), '① 배송 정보', { blocker: true });
    await 주문서.요청사항.selectOption({ label: '직접 입력' });
    await 주문서.요청직접입력.waitFor();
    await verify('요청 사항 직접 입력 칸이 보인다', await 주문서.요청직접입력.isVisible(), true, { blocker: true });
  });

  await test.step('요청 사항 「직접 입력」 칸에 51자를 적는다', async () => {
    await 주문서.요청직접입력.fill('가'.repeat(51));
    await verify('요청 사항 직접 입력 칸에 51자를 적으면 50자까지만 들어간다', (await 주문서.요청직접입력.inputValue()).length, 50);
  });

  await test.step('요청 사항 「직접 입력」 칸에 50자를 적는다', async () => {
    await 주문서.요청직접입력.fill('나'.repeat(50));
    await verify('요청 사항 직접 입력 칸에 50자를 적으면 50자가 모두 들어간다', await 주문서.요청직접입력.inputValue(), '나'.repeat(50));
  });
});
