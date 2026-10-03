import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

type 주문요약 = { id: string; status: string };

export const spec = defineCase({
  tcId: 'MKT-FN-036',
  name: '「결제완료」 주문 상세에만 「주문 취소」 버튼이 보이고 다른 상태의 주문 상세에는 보이지 않는다',
  precondition: ['상태가 「결제완료」인 주문이 있다', '상태가 「결제완료」가 아닌 주문이 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user1'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 머리 = new 머리글(page);
  const 상세 = new 주문상세화면(page);
  await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });
  const 주문들 = (await (await page.request.get('/api/orders?period=all')).json()).items as 주문요약[];
  const 결제완료주문 = 주문들.find((주문) => 주문.status === '결제완료')?.id ?? '';
  const 다른상태주문 = 주문들.find((주문) => 주문.status !== '결제완료')?.id ?? '';

  await test.step('그 주문의 상세 화면을 연다', async () => {
    await 상세.열기(결제완료주문);
    await 머리.로그아웃버튼().waitFor();
    await 상세.상태글자().waitFor();
    await verify('상태가 「결제완료」인 주문이 있다', await 상세.상태글자().innerText(), '결제완료', { blocker: true });
    await verify('「결제완료」 상태의 주문 상세에는 「주문 취소」 버튼이 보인다', await 상세.취소버튼().isVisible(), true);
    await 상세.열기(다른상태주문);
    await 상세.상태글자().waitFor();
    await verify('상태가 「결제완료」가 아닌 주문이 있다', (await 상세.상태글자().innerText()) !== '결제완료', true, { blocker: true });
    await verify('「결제완료」가 아닌 주문 상세에는 「주문 취소」 버튼이 보이지 않는다', await 상세.취소버튼().isVisible(), false);
  });
});
