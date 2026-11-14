import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 제재풀기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-193',
  name: '없는 제재 번호를 풀면 404 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  await test.step('없는 제재 번호를 푼다', async () => {
    const 응답 = await 제재풀기(admin, 2_147_480_000, '[QA] 없는 제재 해제');
    await verify('없는 제재 번호를 풀면 404 다', 응답.status(), expected.응답코드);
  });
});
