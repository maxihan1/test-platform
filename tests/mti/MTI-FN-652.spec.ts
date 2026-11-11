import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 구독주소 } from './helpers/social.helper.js';
import { 푸시구독내용, 푸시구독지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-652',
  name: '푸시 구독을 두 번 만들면 조회한 구독의 endpoint 가 두 번째 것이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 토큰 = params.userPassword ?? '';
  try {
    await test.step('일반 회원 토큰으로 푸시 구독을 두 번 만든다', async () => {
      const 첫째 = 푸시구독내용();
      const 둘째 = 푸시구독내용();
      await request.post('/api/v1/push/subscription', { headers: 머리(토큰), data: 첫째 });
      await request.post('/api/v1/push/subscription', { headers: 머리(토큰), data: 둘째 });
      const 조회 = await request.get('/api/v1/push/subscription', { headers: 머리(토큰) });
      const 몸 = (await 조회.json()) as { endpoint?: string };
      await verify('푸시 구독을 두 번 만들면 조회한 구독의 endpoint 가 두 번째 것이다', 몸.endpoint, 구독주소(둘째));
    });
  } finally {
    await 푸시구독지우기(request, 토큰);
  }
});
