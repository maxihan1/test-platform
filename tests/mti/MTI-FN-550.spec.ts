import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-550',
  name: '계정 검색을 limit=40 으로 부르면 40개 이하로 온다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽한도: z.number().int().min(1).max(40).describe('안쪽 시험 한도 — 1에서 40 사이').default(40),
    바깥한도: z.number().int().min(41).describe('바깥 시험 한도 — 41 이상').default(41),
  }),
  expected: z.object({
    최대계정수: z.number().describe('한 쪽 최대 계정 수').default(40),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v2/search?q=a&type=accounts&limit=40 을 부른다', async () => {
    const 응답 = await request.get(`/api/v2/search?q=a&type=accounts&limit=${params.안쪽한도}`, { headers: 머리(토큰) });
    const 몸 = (await 응답.json()) as { accounts?: unknown[] };
    await verify('계정 검색을 limit=40 으로 부르면 40개 이하로 온다', (몸.accounts ?? []).length <= expected.최대계정수, true);
  });
  await test.step('일반 회원 토큰으로 GET /api/v2/search?q=a&type=accounts&limit=41 을 부른다', async () => {
    const 응답 = await request.get(`/api/v2/search?q=a&type=accounts&limit=${params.바깥한도}`, { headers: 머리(토큰) });
    const 몸 = (await 응답.json()) as { accounts?: unknown[] };
    await verify('계정 검색 limit=41 응답이 40개 이하다', (몸.accounts ?? []).length <= expected.최대계정수, true);
  });
});
