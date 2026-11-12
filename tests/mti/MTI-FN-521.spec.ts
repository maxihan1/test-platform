import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-521',
  name: 'GET /api/v1/timelines/home 을 토큰 없이 부르면 오류 문구가 「액세스 토큰이 잘못되었습니다.」 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: null,
  expected: z.object({
    오류문구: z.string().describe('오류 문구').default('액세스 토큰이 잘못되었습니다.'),
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/v1/timelines/home 을 토큰 없이 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/home');
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('GET /api/v1/timelines/home 을 토큰 없이 부르면 오류 문구가 「액세스 토큰이 잘못되었습니다.」 다', 몸.error, expected.오류문구);
    await verify('응답 코드가 401 이다', 응답.status(), expected.응답코드);
  });
});
