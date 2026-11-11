import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-561',
  name: '없는 계정을 부르면 오류 문구가 「Record not found」 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    오류문구: z.string().describe('오류 문구').default('Record not found'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/accounts/999999999 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/accounts/${없는번호}`);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('없는 계정을 부르면 오류 문구가 「Record not found」 다', 몸.error, expected.오류문구);
  });
});
