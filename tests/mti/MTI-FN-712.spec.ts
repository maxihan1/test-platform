import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-712',
  name: '홈 타임라인이 빈 계정으로 GET /api/v1/timelines/home 을 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['홈 타임라인이 빈 계정 토큰이 있다'],
  params: z.object({
    emptyHomePassword: z.string().describe('홈 타임라인이 빈 계정 토큰').optional().meta({ secret: true, account: '홈이 빈 계정' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('홈 타임라인 응답 코드').default(200),
    글수: z.number().describe('받은 글 수').default(0),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.emptyHomePassword ?? '';
  await test.step('홈 타임라인이 빈 계정으로 GET /api/v1/timelines/home 을 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/home', { headers: 머리(토큰) });
    await verify('홈 타임라인이 빈 계정으로 GET /api/v1/timelines/home 을 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    const 글들 = (await 응답.json().catch(() => null)) as unknown[] | null;
    await verify('받은 글이 0건이다', Array.isArray(글들) ? 글들.length : -1, expected.글수);
  });
});
