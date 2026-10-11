import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-147',
  name: '일반 회원이 회원 목록을 요청하면 403 으로 응답한다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['동등 분할', '상태 전이'],
});

test(spec, async ({ request, params }) => {
  await test.step('회원으로 로그인한다', async () => {
    await verify('로그인 요청이 200 으로 응답한다', await API로그인(request, params.loginId ?? '', params.password ?? ''), 200, { blocker: true });
  });

  await test.step('일반 회원으로 관리자 회원 목록 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/admin/users');
    await verify('일반 회원이 회원 목록을 요청하면 403 으로 응답한다', 응답.status(), 403);
  });

  await test.step('일반 회원으로 잠금 해제 API 를 요청한다', async () => {
    const 응답 = await request.post('/api/admin/users/1/unlock');
    await verify('일반 회원이 잠금 해제를 요청하면 403 으로 응답한다', 응답.status(), 403);
  });

  await test.step('일반 회원으로 배너 저장 API 를 요청한다', async () => {
    const 현재 = ((await (await request.get('/api/banners')).json()) as { items: unknown[] }).items;
    const 응답 = await request.put('/api/admin/banners', { data: { items: 현재 } });
    await verify('일반 회원이 배너 저장을 요청하면 403 으로 응답한다', 응답.status(), 403);
  });

  await test.step('일반 회원으로 공지 팝업 변경 API 를 요청한다', async () => {
    const 현재 = (await (await request.get('/api/settings')).json()) as { noticePopup: boolean };
    const 응답 = await request.put('/api/admin/settings', { data: { noticePopup: 현재.noticePopup } });
    await verify('일반 회원이 공지 팝업 변경을 요청하면 403 으로 응답한다', 응답.status(), 403);
  });

  await test.step('일반 회원으로 주문 CSV API 를 요청한다', async () => {
    const 응답 = await request.get('/api/admin/orders.csv');
    await verify('일반 회원이 주문 CSV 를 요청하면 403 으로 응답한다', 응답.status(), 403);
  });
});
