import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 응답번호들 } from './helpers/manage.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-552',
  name: '팔로우한 태그를 limit=200 으로 부르면 200개 이하로 온다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    안쪽한도: z.number().int().min(1).max(200).describe('안쪽 시험 한도 — 1에서 200 사이').default(200),
    바깥한도: z.number().int().min(201).describe('바깥 시험 한도 — 201 이상').default(201),
  }),
  expected: z.object({
    최대태그수: z.number().describe('한 쪽 최대 태그 수').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  await test.step('일반 회원 토큰으로 GET /api/v1/followed_tags?limit=200 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/followed_tags?limit=${params.안쪽한도}`, 토큰);
    await verify('팔로우한 태그를 limit=200 으로 부르면 200개 이하로 온다', 번호들.length <= expected.최대태그수, true);
  });
  await test.step('일반 회원 토큰으로 GET /api/v1/followed_tags?limit=201 을 부른다', async () => {
    const 번호들 = await 응답번호들(request, `/api/v1/followed_tags?limit=${params.바깥한도}`, 토큰);
    await verify('팔로우한 태그 limit=201 응답의 태그가 200개 이하다', 번호들.length <= expected.최대태그수, true);
  });
});
