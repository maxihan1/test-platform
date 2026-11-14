import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 지급회수 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-235',
  name: '없는 지급 번호를 회수하면 404 다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: z.object({}),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  await test.step('없는 지급 번호를 회수한다', async () => {
    const 응답 = await 지급회수(admin, 2147480000, '[QA] ARI-FN-235 없는 지급 회수');
    await verify('없는 지급 번호를 회수하면 404 다', 응답.status(), expected.응답코드);
  });
});
