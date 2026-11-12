import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 푸시공개키 } from './helpers/social.helper.js';
import { 푸시구독내용, 푸시구독지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-654',
  name: '푸시 구독을 만들면 server_key 가 인스턴스 정보의 configuration.vapid.public_key 와 같다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '인스턴스 정보에 푸시 공개키가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  const 토큰 = params.userPassword ?? '';
  const 공개키 = await 푸시공개키(request);
  try {
    await test.step('인스턴스 정보를 확인한다', async () => {
      await verify('인스턴스 정보에 푸시 공개키가 있다', 공개키 !== '', true, { blocker: true });
    });
    await test.step('일반 회원 토큰으로 푸시 구독을 만든다', async () => {
      const 응답 = await request.post('/api/v1/push/subscription', { headers: 머리(토큰), data: 푸시구독내용() });
      const 몸 = (await 응답.json()) as { server_key?: string };
      await verify('푸시 구독을 만들면 server_key 가 인스턴스 정보의 configuration.vapid.public_key 와 같다', 몸.server_key, 공개키);
    });
  } finally {
    await 푸시구독지우기(request, 토큰);
  }
});
