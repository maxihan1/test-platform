import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-557',
  name: '글 번호 21개로 여러 글을 부르면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: z.object({
    글번호수: z.number().int().min(21).describe('보낼 글 번호 수 — 21 이상').default(21),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(422),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  await test.step('글 번호 21개로 GET /api/v1/statuses?id[]= 를 부른다', async () => {
    const 질의 = Array.from({ length: params.글번호수 }, (_, 순번) => `id[]=${1000 + 순번}`).join('&');
    const 응답 = await request.get(`/api/v1/statuses?${질의}`);
    await verify('글 번호 21개로 여러 글을 부르면 응답 코드가 422 다', 응답.status(), expected.응답코드);
  });
});
