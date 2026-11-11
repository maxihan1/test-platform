import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-525',
  name: 'GET /api/v1/announcements 를 토큰 없이 부르면 오류 문구가 「This method requires an authenticated user」 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    오류문구: z.string().describe('오류 문구').default('This method requires an authenticated user'),
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/announcements 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get('/api/v1/announcements');
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('GET /api/v1/announcements 를 토큰 없이 부르면 오류 문구가 「This method requires an authenticated user」 다', 몸.error, expected.오류문구);
    await verify('응답 코드가 422 다', 응답.status(), expected.응답코드);
  });
});
