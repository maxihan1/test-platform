import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 자동완성검색어찾기 } from './helpers/my-page.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-406',
  name: '자동완성 결과가 5개인 검색어면 자동완성 응답이 5개다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ request }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('결과가 5개인 검색어로 GET /api/products/suggest 를 부른다', async () => {
    const 검색어 = await 자동완성검색어찾기(request, 5);
    const 응답 = await request.get('/api/products/suggest', { params: { q: 검색어 } });
    await verify('자동완성 결과가 5개인 검색어면 자동완성 응답이 5개다', ((await 응답.json()) as { items: unknown[] }).items.length, 5);
  });

  await test.step('결과가 6개 이상인 검색어로 자동완성을 부른다', async () => {
    const 검색어 = await 자동완성검색어찾기(request, 6);
    const 응답 = await request.get('/api/products/suggest', { params: { q: 검색어 } });
    await verify('자동완성 결과가 6개 이상인 검색어여도 자동완성 응답은 5개다', ((await 응답.json()) as { items: unknown[] }).items.length, 5);
  });
});
