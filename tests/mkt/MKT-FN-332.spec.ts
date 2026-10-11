import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-332',
  name: '회원이 PUT /api/admin/banners 를 보내면 403 으로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['회원으로 로그인한 요청이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 계정 = 계정값(params);

  await test.step('회원으로 로그인한다', async () => {
    await API로그인(request, 계정.loginId, 계정.password);
  });

  await test.step('회원으로 로그인했는지 확인한다', async () => {
    await verify('로그인한 회원 세션이 있다', (await 내정보(request)).loginId === 계정.loginId, true, { blocker: true });
  });

  await test.step('PUT /api/admin/banners 를 보낸다', async () => {
    const 현재 = (await (await request.get('/api/banners')).json()) as { items: { id: number; visible: boolean }[] };
    const 응답 = await request.put('/api/admin/banners', { data: { items: 현재.items.map((배너) => ({ id: 배너.id, visible: 배너.visible })) } });
    await verify('회원이 PUT /api/admin/banners 를 보내면 403 으로 응답한다', 응답.status(), 403);
  });
});
