import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 푸시구독지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-653',
  name: '구독이 없는데 조회하면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  await 푸시구독지우기(request, 토큰);
  await test.step('구독이 없는 두 번째 사용자 토큰으로 GET /api/v1/push/subscription 을 부른다', async () => {
    const 응답 = await request.get('/api/v1/push/subscription', { headers: 머리(토큰) });
    await verify('구독이 없는데 조회하면 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
  await test.step('구독이 없는 두 번째 사용자 토큰으로 PUT /api/v1/push/subscription 을 부른다', async () => {
    const 응답 = await request.put('/api/v1/push/subscription', { headers: 머리(토큰), data: { data: { alerts: { mention: true } } } });
    await verify('구독이 없을 때 구독 수정의 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
});
