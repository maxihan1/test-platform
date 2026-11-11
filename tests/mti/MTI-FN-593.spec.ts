import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 관계 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-593',
  name: '차단한 상대의 글 목록을 부르면 404 이거나 빈 목록이다',
  apiDoc: 1,
  precondition: ['일반 회원이 troll_kim 을 차단해 두었다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    막힘: z.boolean().describe('404 이거나 빈 목록인지').default(true),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호 = await 계정번호(request, 'troll_kim');
  await test.step('차단 상태를 확인한다', async () => {
    await verify('일반 회원이 troll_kim 을 차단해 두었다', 번호 !== '' && (await 관계(request, 토큰, 번호)).blocking === true, true, { blocker: true });
  });
  await test.step('일반 회원 토큰으로 GET /api/v1/accounts/{troll_kim}/statuses 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${번호}/statuses`, { headers: 머리(토큰) });
    const 글들 = 응답.status() === 200 ? ((await 응답.json()) as unknown[]) : [];
    await verify('차단한 상대의 글 목록을 부르면 404 이거나 빈 목록이다', 응답.status() === 404 || (응답.status() === 200 && 글들.length === 0), expected.막힘);
  });
});
