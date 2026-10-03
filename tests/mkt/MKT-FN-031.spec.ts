import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-031',
  name: '관리자 API 는 관리자에게만 열리고 일반 회원에게는 403 FORBIDDEN 이 온다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다', '일반 회원 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, request, params }) => {
  const 일반회원 = page.request;
  const 거절 = async (응답: { status(): number; json(): Promise<unknown> }): Promise<[number, unknown]> => [
    응답.status(),
    ((await 응답.json()) as { code?: string }).code,
  ];

  await test.step('관리자와 일반 회원으로 로그인한다', async () => {
    const 관리자로그인 = await request.post('/api/auth/login', { data: { loginId: params.adminId, password: params.adminPassword ?? '', remember: false } });
    const 회원로그인 = await 일반회원.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '', remember: false } });
    await verify('관리자와 일반 회원이 로그인한다', [관리자로그인.status(), 회원로그인.status()], [200, 200], { blocker: true });
  });

  await test.step('GET /api/admin/users 를 부른다', async () => {
    const 관리자응답 = await request.get('/api/admin/users');
    await verify(
      '관리자가 GET /api/admin/users 를 부르면 200 과 회원 목록이 온다',
      [관리자응답.status(), Array.isArray(((await 관리자응답.json()) as { items: unknown }).items)],
      [200, true],
    );
    await verify('일반 회원이 GET /api/admin/users 를 부르면 403 FORBIDDEN 이 온다', await 거절(await 일반회원.get('/api/admin/users')), [403, 'FORBIDDEN']);
  });

  await test.step('PUT /api/admin/banners 를 부른다', async () => {
    const 응답 = await 일반회원.put('/api/admin/banners', { data: { items: '본문 검사 전에 막히는지 보려는 틀린 값' } });
    await verify('일반 회원이 PUT /api/admin/banners 를 부르면 403 FORBIDDEN 이 온다', await 거절(응답), [403, 'FORBIDDEN']);
  });

  await test.step('PUT /api/admin/settings 를 부른다', async () => {
    const 응답 = await 일반회원.put('/api/admin/settings', { data: { noticePopup: '본문 검사 전에 막히는지 보려는 틀린 값' } });
    await verify('일반 회원이 PUT /api/admin/settings 를 부르면 403 FORBIDDEN 이 온다', await 거절(응답), [403, 'FORBIDDEN']);
  });

  await test.step('GET /api/admin/orders.csv 를 부른다', async () => {
    const 관리자응답 = await request.get('/api/admin/orders.csv');
    const 첫줄 = (await 관리자응답.text()).replace(/^﻿/, '').split(/\r?\n/)[0];
    await verify(
      '관리자가 GET /api/admin/orders.csv 를 부르면 주문 CSV 가 내려온다',
      [관리자응답.status(), (관리자응답.headers()['content-type'] ?? '').includes('csv'), 첫줄],
      [200, true, '주문번호,주문일,아이디,결제금액,상태'],
    );
    await verify('일반 회원이 GET /api/admin/orders.csv 를 부르면 403 FORBIDDEN 이 온다', await 거절(await 일반회원.get('/api/admin/orders.csv')), [403, 'FORBIDDEN']);
  });
});
