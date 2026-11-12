import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유이름 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-660',
  name: '존재하지 않는 태그 이름으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  const 이름 = 고유이름('mti없는태그');
  await test.step('아직 없는 태그 이름으로 GET /api/v1/tags/{name} 을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/tags/${encodeURIComponent(이름)}`);
    await verify('존재하지 않는 태그 이름으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
