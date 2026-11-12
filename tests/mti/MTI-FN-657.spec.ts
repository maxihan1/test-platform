import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-657',
  name: '토큰 없이 resolve=true 검색을 부르면 응답 코드가 401 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: z.object({
    검색어: z.string().describe('검색어 — 1자 이상의 글자').default('hana'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
    오류문구: z.string().describe('오류 문구').default('Search queries that resolve remote resources are not supported without authentication'),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('GET /api/v2/search?q=hana&resolve=true 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v2/search?q=${encodeURIComponent(params.검색어)}&resolve=true`);
    await verify('토큰 없이 resolve=true 검색을 부르면 응답 코드가 401 이다', 응답.status(), expected.응답코드);
    const 몸 = (await 응답.json()) as { error?: string };
    await verify('오류 문구가 「Search queries that resolve remote resources are not supported without authentication」 이다', 몸.error, expected.오류문구);
  });
});
