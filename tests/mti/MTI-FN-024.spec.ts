import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-024',
  name: 'DELETE /api/v1/profile/header 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  await test.step('DELETE /api/v1/profile/header 를 두 번째 사용자 토큰으로 부른다', async () => {
    const 응답 = await request.delete('/api/v1/profile/header', { headers: 머리(토큰) });
    await verify('DELETE /api/v1/profile/header 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
