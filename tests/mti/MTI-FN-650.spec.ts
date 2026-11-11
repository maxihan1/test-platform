import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-650',
  name: '홈 타임라인이 비어 있으면 200 과 빈 배열이 온다',
  apiDoc: 1,
  precondition: ['홈 타임라인이 빈 계정 토큰이 있다'],
  params: z.object({
    emptyHomePassword: z.string().describe('홈 타임라인이 빈 계정 토큰').meta({ secret: true, account: '홈 타임라인이 빈 계정' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
  techniques: ['경계값 분석'],
  held: '보류 — 홈 타임라인이 빈 계정의 토큰이 없다',
});

test(spec, async ({ request, params, expected }) => {
  await test.step('홈 타임라인이 빈 계정으로 GET /api/v1/timelines/home 을 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/home', { headers: 머리(params.emptyHomePassword) });
    const 코드 = await verify('홈 타임라인이 빈 계정으로 부른 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    const 줄들 = (await 응답.json()) as unknown[];
    const 빔 = await verify('홈 타임라인이 빈 계정으로 부른 응답 목록이 비어 있다', 줄들.length, 0);
    await verify('홈 타임라인이 비어 있으면 200 과 빈 배열이 온다', 코드 && 빔, true);
  });
});
