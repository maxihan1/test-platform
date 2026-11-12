import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 관계 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-588',
  name: '팔로워 토큰으로 yuna_locked 글 목록을 부르면 private 글이 1개 이상 있다',
  apiDoc: 1,
  precondition: ['두 번째 사용자가 잠긴 계정 yuna_locked 의 승인된 팔로워다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    최소개수: z.number().describe('private 글 최소 개수').default(1),
    없어야하는개수: z.number().describe('토큰 없이 받은 private 글 수').default(0),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  const 번호 = await 계정번호(request, 'yuna_locked');
  await test.step('두 번째 사용자의 팔로우 상태를 확인한다', async () => {
    await verify('두 번째 사용자가 잠긴 계정 yuna_locked 의 승인된 팔로워다', 번호 !== '' && (await 관계(request, 토큰, 번호)).following === true, true, { blocker: true });
  });
  await test.step('두 번째 사용자 토큰으로 GET /api/v1/accounts/{yuna_locked}/statuses 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${번호}/statuses?limit=40`, { headers: 머리(토큰) });
    const 글들 = (await 응답.json()) as { visibility?: string }[];
    const 비공개 = 글들.filter((글) => 글.visibility === 'private').length;
    await verify('팔로워 토큰으로 yuna_locked 글 목록을 부르면 private 글이 1개 이상 있다', 비공개 >= expected.최소개수, true);
  });
  await test.step('토큰 없이 GET /api/v1/accounts/{yuna_locked}/statuses 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${번호}/statuses?limit=40`);
    const 글들 = (await 응답.json()) as { visibility?: string }[];
    const 비공개 = 글들.filter((글) => 글.visibility === 'private').length;
    await verify('토큰 없이 받은 yuna_locked 글 목록에는 private 글이 없다', 비공개, expected.없어야하는개수);
  });
});
