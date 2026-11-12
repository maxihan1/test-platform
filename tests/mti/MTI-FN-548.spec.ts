import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-548',
  name: '알림을 limit=80 으로 부르면 80개 이하로 온다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽한도: z.number().int().min(1).max(80).describe('안쪽 시험 한도 — 1에서 80 사이').default(80),
    바깥한도: z.number().int().min(81).describe('바깥 시험 한도 — 81 이상').default(81),
  }),
  expected: z.object({
    최대알림수: z.number().describe('한 쪽 최대 알림 수').default(80),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v1/notifications?limit=80 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/notifications?limit=${params.안쪽한도}`, 토큰);
    await verify('알림을 limit=80 으로 부르면 80개 이하로 온다', 번호들.length <= expected.최대알림수, true);
  });
  await test.step('일반 회원 토큰으로 GET /api/v1/notifications?limit=81 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/notifications?limit=${params.바깥한도}`, 토큰);
    await verify('알림 limit=81 응답의 알림이 80개 이하다', 번호들.length <= expected.최대알림수, true);
  });
});
