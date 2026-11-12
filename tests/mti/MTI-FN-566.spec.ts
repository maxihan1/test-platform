import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-566',
  name: 'Accept-Language: ko 로 없는 글을 부르면 오류 문구가 「Record not found」 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    오류문구: z.string().describe('오류 문구').default('Record not found'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('Accept-Language: ko 머리로 GET /api/v1/statuses/999999999 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/statuses/${없는번호}`, { headers: { 'Accept-Language': 'ko' } });
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('Accept-Language: ko 로 없는 글을 부르면 오류 문구가 「Record not found」 다', 몸.error, expected.오류문구);
  });
});
