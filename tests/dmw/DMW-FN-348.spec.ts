import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새아이디 } from './helpers/account.helper.js';
import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-348',
  name: '없는 아이디는 「available」이 true 다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    있는아이디: z.string().min(1).describe('이미 가입돼 있는 아이디').default('admin'),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('없는 아이디로 GET /api/auth/check-id 를 부른다', async () => {
    const 응답 = await request.get(`/api/auth/check-id?loginId=${새아이디()}`);
    await verify('없는 아이디는 「available」이 true 다', (await 몸읽기<{ available?: boolean }>(응답)).available, true);
  });

  await test.step('「admin」으로 GET /api/auth/check-id 를 부른다', async () => {
    const 응답 = await request.get(`/api/auth/check-id?loginId=${params.있는아이디}`);
    await verify('이미 있는 아이디는 「available」이 false 다', (await 몸읽기<{ available?: boolean }>(응답)).available, false);
  });
});
