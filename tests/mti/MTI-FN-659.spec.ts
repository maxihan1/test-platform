import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-659',
  name: '형식에 맞지 않는 해시태그 이름으로 부르면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: z.object({
    잘못된이름: z.string().describe('형식에 맞지 않는 해시태그 이름 — 하이픈이 든 이름').default('mti-bad-name'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('GET /api/v1/tags/mti-bad-name 을 부른다', async () => {
    const 응답 = await request.get(`/api/v1/tags/${encodeURIComponent(params.잘못된이름)}`);
    await verify('형식에 맞지 않는 해시태그 이름으로 부르면 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
});
