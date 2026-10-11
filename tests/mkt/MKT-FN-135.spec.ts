import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 장바구니읽기 } from './helpers/cart.helper.js';
import { 내주문들읽기 } from './helpers/home.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-135',
  name: 'POST /api/reset 을 요청하면 204 로 응답한다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('자료 되돌리기 API 를 요청한다', async () => {
    const 응답 = await request.post('/api/reset');
    await verify('POST /api/reset 을 요청하면 204 로 응답한다', 응답.status(), 204);
  });

  await test.step('되돌린 뒤 첫 회원의 장바구니와 주문을 확인한다', async () => {
    await verify('로그인 요청이 200 으로 응답한다', await API로그인(request, params.loginId ?? '', params.password ?? ''), 200, { blocker: true });
    await verify(
      '되돌린 뒤 첫 회원의 장바구니는 두 줄이고 주문은 세 건이다',
      { 장바구니줄: (await 장바구니읽기(request)).length, 주문: (await 내주문들읽기(request)).length },
      { 장바구니줄: 2, 주문: 3 },
    );
  });
});
