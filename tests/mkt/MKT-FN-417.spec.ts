import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-417',
  name: '주소 검색 요청은 검색어가 든 주소를 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    검색어: z.string().min(2).describe('주소 검색어 — 2자 이상, 서버에 있는 주소에 든 글자').default('테헤란로'),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('GET /api/address?q=테헤란로 를 부른다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: params.검색어 } });
    const 주소들 = ((await 응답.json()) as { items: { address: string }[] }).items;
    await verify(
      '주소 검색 요청은 검색어가 든 주소를 준다',
      { 상태: 응답.status(), 하나이상: 주소들.length > 0, 모두검색어포함: 주소들.every((주소) => 주소.address.includes(params.검색어)) },
      { 상태: 200, 하나이상: true, 모두검색어포함: true },
    );
  });
});
