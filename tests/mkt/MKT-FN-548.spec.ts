import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 관리자계정값 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-548',
  name: '관리자가 회원 목록을 부르면 200 과 회원 목록이 온다',
  platforms: ['desktop'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminLoginId: z.string().describe('관리자 아이디').default('admin'),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ request, params }) => {
  const 계정 = 관리자계정값(params);
  await test.step('관리자 계정으로 로그인한다', async () => {
    await API로그인(request, 계정.loginId, 계정.password);
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    const 나 = (await (await request.get('/api/auth/me')).json()) as { role?: string };
    await verify('관리자 계정으로 로그인해 있다', 나.role, 'admin', { blocker: true });
  });

  await test.step('관리자 회원 목록 /api/admin/users 를 부른다', async () => {
    const 응답 = await request.get('/api/admin/users');
    const 본문 = (await 응답.json()) as { items?: unknown[] };
    await verify('관리자가 회원 목록을 부르면 200 과 회원 목록이 온다', [응답.status(), Array.isArray(본문.items) && 본문.items.length > 0], [200, true]);
  });
});
