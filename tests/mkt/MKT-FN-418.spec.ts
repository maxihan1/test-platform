import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-418',
  name: '주소 검색어가 1자면 400 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    한글자: z.string().length(1).describe('1자 검색어 — 글자 하나').default('테'),
    두글자: z.string().length(2).describe('2자 검색어 — 글자 둘').default('테헤'),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('1자 검색어로 주소 검색을 부른다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: params.한글자 } });
    await verify('주소 검색어가 1자면 400 으로 응답한다', 응답.status(), 400);
  });

  await test.step('2자 검색어로 주소 검색을 부른다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: params.두글자 } });
    await verify('주소 검색어가 2자면 200 으로 응답한다', 응답.status(), 200);
  });
});
