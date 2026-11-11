import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는번호 } from './helpers/auth.helper.js';
import { 첫컬렉션번호 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-345',
  name: 'GET /api/v1/collections/{id} 를 없는 번호로 부르면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '일반 회원의 컬렉션이 있다'],
  params: null,
  expected: z.object({
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, expected }) => {
  let 번호 = '';
  번호 = await 첫컬렉션번호(request, 'qa_user1');
  await test.step('준비한 번호를 확인한다', async () => {
    await verify('일반 회원의 컬렉션이 있다', 번호 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1/collections/{id} 를 없는 번호로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/collections/${없는번호}`);
    await verify('GET /api/v1/collections/{id} 를 없는 번호로 부르면 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
  });
});
