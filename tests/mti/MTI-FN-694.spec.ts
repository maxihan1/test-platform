import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-694',
  name: 'WebSocket 을 열어 user 스트림을 구독하면 연결이 열린다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('연결이 열릴 때 응답 코드').default(101),
  }),
  held: '보류 — 케이스 요청 도구로 WebSocket 을 열 길이 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('GET /api/v1/streaming 으로 WebSocket 을 열고 user 스트림을 구독한다', async () => {
    const 응답 = await request.get('/api/v1/streaming?stream=user', {
      headers: { ...머리(토큰), Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==' },
    });
    await verify('WebSocket 을 열어 user 스트림을 구독하면 연결이 열린다', 응답.status(), expected.응답코드);
  });
});
