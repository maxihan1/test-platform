import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 컬렉션만들기, 컬렉션지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-354',
  name: 'POST /api/v1/collections/{collection_id}/items 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 만든 컬렉션이 있다', '시드 계정 minjun_dev 가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 컬렉션 = '';
  try {
    컬렉션 = await 컬렉션만들기(request, 토큰);
    const 대상 = await 계정번호(request, 'minjun_dev');
    await test.step('준비한 컬렉션을 확인한다', async () => {
      await verify('일반 회원이 만든 컬렉션이 있다', 컬렉션 !== '', true, { blocker: true });
      await verify('시드 계정 minjun_dev 가 있다', 대상 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/collections/{collection_id}/items 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post(`/api/v1/collections/${컬렉션}/items`, { headers: 머리(토큰), data: { account_id: 대상 } });
      await verify('POST /api/v1/collections/{collection_id}/items 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 컬렉션지우기(request, 토큰, 컬렉션);
  }
});
