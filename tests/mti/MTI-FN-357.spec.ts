import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 없는번호, 머리 } from './helpers/auth.helper.js';
import { 컬렉션항목더하기 } from './helpers/social.helper.js';
import { 컬렉션만들기, 컬렉션지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-357',
  name: 'DELETE /api/v1/collections/{collection_id}/items/{id} 를 토큰 없이 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다', '일반 회원 토큰이 있다', '일반 회원이 만든 컬렉션에 계정 항목이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    토큰없음응답코드: z.number().describe('토큰 없이 부를 때 응답 코드').default(401),
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 컬렉션 = '';
  try {
    컬렉션 = await 컬렉션만들기(request, 토큰);
    const 항목 = await 컬렉션항목더하기(request, 토큰, 컬렉션, await 계정번호(request, 'minjun_dev'));
    await test.step('준비한 컬렉션 항목을 확인한다', async () => {
      await verify('일반 회원이 만든 컬렉션에 계정 항목이 있다', 항목 !== '', true, { blocker: true });
    });
    await test.step('DELETE /api/v1/collections/{collection_id}/items/{id} 를 토큰 없이 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/collections/${컬렉션}/items/${항목}`);
      await verify('DELETE /api/v1/collections/{collection_id}/items/{id} 를 토큰 없이 부르면 응답 코드가 401 이다', 응답.status(), expected.토큰없음응답코드);
    });
    await test.step('DELETE /api/v1/collections/{collection_id}/items/{id} 를 없는 번호로 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/collections/${컬렉션}/items/${없는번호}`, { headers: 머리(토큰) });
      await verify('DELETE /api/v1/collections/{collection_id}/items/{id} 를 없는 번호로 부른 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
    });
  } finally {
    await 컬렉션지우기(request, 토큰, 컬렉션);
  }
});
