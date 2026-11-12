import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리, 고유이름 } from './helpers/auth.helper.js';
import { 필터지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-671',
  name: 'expires_in=3600 으로 필터를 만들면 expires_at 이 지금부터 3,600초 뒤 1분 안쪽이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    유효초: z.number().describe('필터 유효 시간(초) — 60 이상').default(3600),
  }),
  expected: z.object({
    허용초: z.number().describe('expires_at 오차 한도(초)').default(60),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  try {
    await test.step('expires_in=3600 으로 필터를 만든다', async () => {
      const 보낸시각 = Date.now();
      const 응답 = await request.post('/api/v2/filters', {
        headers: 머리(토큰),
        data: { title: 고유이름('MTI 필터 '), context: ['home'], filter_action: 'warn', expires_in: params.유효초 },
      });
      const 몸 = (await 응답.json()) as { id?: string; expires_at?: string | null };
      번호 = 몸.id ?? '';
      const 차이초 = Math.abs(Date.parse(몸.expires_at ?? '') - (보낸시각 + params.유효초 * 1000)) / 1000;
      await verify('expires_in=3600 으로 필터를 만들면 expires_at 이 지금부터 3,600초 뒤 1분 안쪽이다', 차이초 <= expected.허용초, true);
    });
  } finally {
    await 필터지우기(request, 토큰, 번호);
  }
});
