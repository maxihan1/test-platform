import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 첫컬렉션번호 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-675',
  name: '주인에게 차단당한 계정이 컬렉션을 조회하면 응답 코드가 403 이다',
  apiDoc: 1,
  precondition: ['컬렉션 주인에게 차단당한 계정 토큰이 있다', '시드 계정 qa_user1 에게 컬렉션이 있다'],
  params: z.object({
    blockedPassword: z.string().describe('컬렉션 주인에게 차단당한 계정 토큰').meta({ secret: true, account: '컬렉션 주인에게 차단당한 계정' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(403),
  }),
  techniques: ['동등 분할'],
  held: '보류 — 컬렉션 주인에게 차단당해도 되는 계정 토큰이 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 컬렉션 = await 첫컬렉션번호(request, 'qa_user1');
  await test.step('조회할 컬렉션을 확인한다', async () => {
    await verify('시드 계정 qa_user1 에게 컬렉션이 있다', 컬렉션 !== '', true, { blocker: true });
  });
  await test.step('차단당한 계정 토큰으로 GET /api/v1/collections/{id} 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/collections/${컬렉션}`, { headers: 머리(params.blockedPassword) });
    await verify('주인에게 차단당한 계정이 컬렉션을 조회하면 응답 코드가 403 이다', 응답.status(), expected.응답코드);
  });
});
