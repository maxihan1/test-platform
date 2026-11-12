import { defineCase, test, verify } from '@platform/kit';

import { 없는번호 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-559',
  name: '없는 글을 부르면 본문의 error 가 문자열이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('GET /api/v1/statuses/999999999 를 부른다', async () => {
    const 응답 = await request.get(`/api/v1/statuses/${없는번호}`);
    const 몸 = (await 응답.json()) as { error?: unknown };
    await verify('없는 글을 부르면 본문의 error 가 문자열이다', typeof 몸.error === 'string', true);
  });
});
