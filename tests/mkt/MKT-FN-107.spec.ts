import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-107',
  name: 'GET /api/orders 는 period 에 따라 내 주문 목록을 기간별로 준다',
  platforms: ['desktop'],
  precondition: ['주문이 있는 회원 계정으로 로그인해 있다', '이번 실행에서 가입한 회원이 로그인해 있다', '회원 계정으로 로그인해 있다', '비회원이다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
    orderId: z.string().min(1).describe('그 회원의 주문번호').default('DM20260923-0002'),
  }),
  expected: z.object({
    oneMonth: z.number().describe('1개월 주문 수').default(2),
    threeMonths: z.number().describe('3개월 주문 수').default(2),
    all: z.number().describe('전체 주문 수').default(3),
    couponCount: z.number().describe('보유 쿠폰 수').default(2),
  }),
});

const 계정비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

test(spec, async ({ request, params, expected }) => {
  let 새회원로그인됨 = false;
  const 주문수 = async (period: string): Promise<number> =>
    ((await (await request.get('/api/orders', { params: { period } })).json()) as { items: unknown[] }).items.length;

  try {
    await test.step('GET /api/coupons 를 로그인 없이 부른다', async () => {
      const 응답 = await request.get('/api/coupons');
      await verify('로그인 없이 GET /api/coupons 를 부르면 401 이 온다', 응답.status(), 401);
    });

    await test.step('주문이 있는 회원 계정으로 로그인한다', async () => {
      const 로그인 = await request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password, remember: false } });
      if (!로그인.ok()) throw new Error(`로그인 실패 ${로그인.status()}`);
    });

    await test.step('GET /api/orders?period=1m 과 3m 과 all 을 차례로 부른다', async () => {
      await verify(
        'GET /api/orders 는 period 에 따라 내 주문 목록을 기간별로 준다',
        { '1m': await 주문수('1m'), '3m': await 주문수('3m'), all: await 주문수('all') },
        { '1m': expected.oneMonth, '3m': expected.threeMonths, all: expected.all },
      );
    });

    await test.step('GET /api/orders/{id} 를 부른다', async () => {
      const 응답 = await request.get(`/api/orders/${encodeURIComponent(params.orderId)}`);
      const 본문 = (await 응답.json()) as { id?: string };
      await verify('GET /api/orders/{id} 는 내 주문 상세를 준다', { 상태: 응답.status(), 주문번호: 본문.id }, { 상태: 200, 주문번호: params.orderId });
    });

    await test.step('GET /api/coupons 를 부른다', async () => {
      const 응답 = await request.get('/api/coupons');
      const 본문 = (await 응답.json()) as { items: unknown[] };
      await verify('GET /api/coupons 는 로그인한 회원에게 보유 쿠폰 목록을 준다', { 상태: 응답.status(), 쿠폰수: 본문.items.length }, { 상태: 200, 쿠폰수: expected.couponCount });
    });

    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 로그인한다', async () => {
      const 아이디 = 새아이디();
      const 가입 = await request.post('/api/auth/signup', {
        data: {
          loginId: 아이디,
          password: 계정비밀번호,
          passwordConfirm: 계정비밀번호,
          name: '쇼핑시험',
          email: `${아이디}@example.com`,
          phone: '',
          birth: '1990-01-01',
          gender: '선택 안 함',
          interests: [],
          terms: true,
          privacy: true,
          marketing: false,
        },
      });
      if (!가입.ok()) throw new Error(`가입 실패 ${가입.status()}`);
      const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 계정비밀번호, remember: false } });
      if (!로그인.ok()) throw new Error(`로그인 실패 ${로그인.status()}`);
      새회원로그인됨 = true;
    });

    await test.step('다른 회원의 주문을 GET /api/orders/{id} 로 읽는다', async () => {
      const 응답 = await request.get(`/api/orders/${encodeURIComponent(params.orderId)}`);
      await verify('남의 주문을 GET /api/orders/{id} 로 읽으면 403 이 온다', 응답.status(), 403);
    });
  } finally {
    if (새회원로그인됨) await request.delete('/api/me');
  }
});
