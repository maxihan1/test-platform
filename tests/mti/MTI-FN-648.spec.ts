import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MTI-FN-648',
  name: '연합 타임라인을 토큰 없이 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['토큰이 없다'],
  params: z.object({
    태그이름: z.string().describe('로컬 타임라인을 볼 해시태그 이름 — 해시태그로 쓸 수 있는 한글 · 영문 · 숫자').default('오늘의사진'),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  await test.step('GET /api/v1/timelines/public?remote=true 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get('/api/v1/timelines/public?remote=true');
    await verify('연합 타임라인을 토큰 없이 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
  await test.step('GET /api/v1/timelines/tag/오늘의사진?local=true 를 토큰 없이 부른다', async () => {
    const 응답 = await request.get(`/api/v1/timelines/tag/${encodeURIComponent(params.태그이름)}?local=true`);
    await verify('토큰 없이 받은 로컬 해시태그 타임라인의 응답 코드가 200 이다', 응답.status(), expected.응답코드);
  });
});
