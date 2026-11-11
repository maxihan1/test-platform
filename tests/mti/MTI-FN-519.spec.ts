import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 첫공개글 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-519',
  name: '같은 글을 토큰 없이 · 일반 회원 토큰으로 부르면 일반 회원 토큰으로 받은 글에만 favourited 가 있다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '시드 계정 hana_photo 의 공개 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    토큰없는글에있음: z.boolean().describe('토큰 없이 받은 글에 favourited 가 있는지').default(false),
    토큰글에있음: z.boolean().describe('일반 회원 토큰으로 받은 글에 favourited 가 있는지').default(true),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 번호 = await 첫공개글(request, 'hana_photo');
  await test.step('준비한 글을 확인한다', async () => {
    await verify('시드 계정 hana_photo 의 공개 글이 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/statuses/{id} 를 토큰 없이 부르고 일반 회원 토큰으로 다시 부른다', async () => {
    const 토큰없이 = await request.get(`/api/v1/statuses/${번호}`);
    const 토큰없는글 = (await 토큰없이.json()) as Record<string, unknown>;
    const 토큰으로 = await request.get(`/api/v1/statuses/${번호}`, { headers: 머리(토큰) });
    const 토큰글 = (await 토큰으로.json()) as Record<string, unknown>;
    const 없는글 = await verify('토큰 없이 받은 글에는 favourited 가 없다', 'favourited' in 토큰없는글, expected.토큰없는글에있음);
    const 있는글 = await verify('일반 회원 토큰으로 받은 글에는 favourited 가 있다', 'favourited' in 토큰글, expected.토큰글에있음);
    await verify('같은 글을 토큰 없이 · 일반 회원 토큰으로 부르면 일반 회원 토큰으로 받은 글에만 favourited 가 있다', 없는글 && 있는글, true);
  });
});
