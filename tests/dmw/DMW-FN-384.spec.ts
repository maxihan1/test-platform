import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'DMW-FN-384',
  name: '주소 검색어가 1자면 주소 검색 API 가 400 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    한글자검색어: z.string().min(1).describe('주소 검색어 — 1자').default('가'),
    두글자검색어: z.string().min(2).describe('주소 검색어 — 2자 · 주소에 든 낱말').default('테헤'),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params }) => {
  await test.step('GET /api/address?q=가 를 부른다', async () => {
    const 응답 = await request.get(`/api/address?q=${encodeURIComponent(params.한글자검색어)}`);
    await verify('주소 검색어가 1자면 주소 검색 API 가 400 으로 응답한다', 응답.status(), 400);
  });

  await test.step('GET /api/address?q=테헤 를 부른다', async () => {
    const 응답 = await request.get(`/api/address?q=${encodeURIComponent(params.두글자검색어)}`);
    await verify('주소 검색어가 2자면 주소 검색 API 가 200 으로 응답한다', 응답.status(), 200);
  });
});
