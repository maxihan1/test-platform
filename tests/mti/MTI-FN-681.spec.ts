import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 첫컬렉션번호 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-681',
  name: '옛 경로 /api/v1_alpha/collections/{id} 를 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다', '시드 계정 qa_user1 에게 컬렉션이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  const 컬렉션 = await 첫컬렉션번호(request, 'qa_user1');
  await test.step('조회할 컬렉션을 확인한다', async () => {
    await verify('시드 계정 qa_user1 에게 컬렉션이 있다', 컬렉션 !== '', true, { blocker: true });
  });
  await test.step('GET /api/v1_alpha/collections/{id} 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v1_alpha/collections/${컬렉션}`);
    await verify('옛 경로 /api/v1_alpha/collections/{id} 를 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
