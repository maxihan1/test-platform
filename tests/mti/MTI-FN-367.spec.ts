import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-367',
  name: 'GET /api/v1/instance/terms_of_service/{date} 를 없는 번호로 부르면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    없는번호응답코드: z.number().describe('없는 번호로 부를 때 응답 코드').default(404),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/instance/terms_of_service/{date} 를 없는 번호로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/instance/terms_of_service/${없는번호}`);
    await verify('GET /api/v1/instance/terms_of_service/{date} 를 없는 번호로 부르면 응답 코드가 404 다', 응답.status(), expected.없는번호응답코드);
  });
});
