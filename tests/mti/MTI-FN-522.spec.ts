import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 잘못된토큰 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-522',
  name: 'GET /api/v1/timelines/home 을 잘못된 토큰으로 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['잘못된 토큰이 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
    오류문구: z.string().describe('오류 문구').default('액세스 토큰이 잘못되었습니다.'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/timelines/home 을 잘못된 토큰으로 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/home', { headers: 머리(잘못된토큰) });
    await verify('GET /api/v1/timelines/home 을 잘못된 토큰으로 부르면 응답 코드가 401 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('오류 문구가 「액세스 토큰이 잘못되었습니다.」 다', 몸.error, expected.오류문구);
  });
});
