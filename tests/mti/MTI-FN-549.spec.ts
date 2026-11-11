import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-549',
  name: '안 읽은 알림 수를 limit=1000 으로 부르면 count 가 1,000 이하다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽한도: z.number().int().min(1).max(1000).describe('안쪽 시험 한도 — 1에서 1000 사이').default(1000),
    바깥한도: z.number().int().min(1001).describe('바깥 시험 한도 — 1001 이상').default(1001),
  }),
  expected: z.object({
    최대개수: z.number().describe('센 알림 최대 개수').default(1000),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v1/notifications/unread_count?limit=1000 을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/notifications/unread_count?limit=${params.안쪽한도}`, { headers: 머리(토큰) });
    const 몸 = (await 응답.json()) as { count?: number };
    await verify('안 읽은 알림 수를 limit=1000 으로 부르면 count 가 1,000 이하다', (몸.count ?? 0) <= expected.최대개수, true);
  });
  await test.step('일반 회원 토큰으로 GET /api/v1/notifications/unread_count?limit=1001 을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/notifications/unread_count?limit=${params.바깥한도}`, { headers: 머리(토큰) });
    const 몸 = (await 응답.json()) as { count?: number };
    await verify('안 읽은 알림 수 limit=1001 응답의 count 가 1,000 이하다', (몸.count ?? 0) <= expected.최대개수, true);
  });
});
