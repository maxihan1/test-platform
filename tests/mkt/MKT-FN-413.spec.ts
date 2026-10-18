import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-413',
  name: '내 주문 목록과 그 주문 상세를 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('회원으로 로그인한다', async () => {
    await 기본회원으로로그인(request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
  });

  await test.step('GET /api/orders?period=all 과 그 첫 주문의 상세를 부른다', async () => {
    const 목록응답 = await request.get('/api/orders', { params: { period: 'all' } });
    const 주문들 = ((await 목록응답.json()) as { items: { id: string }[] }).items;
    const 첫주문 = 주문들[0]?.id ?? '';
    const 상세응답 = await request.get(`/api/orders/${encodeURIComponent(첫주문)}`);
    const 상세 = (await 상세응답.json()) as { id?: string };
    await verify(
      '내 주문 목록과 그 주문 상세를 준다',
      { 목록: 목록응답.status(), 주문있음: 주문들.length > 0, 상세: 상세응답.status(), 같은주문: 상세.id === 첫주문 },
      { 목록: 200, 주문있음: true, 상세: 200, 같은주문: true },
    );
  });
});
