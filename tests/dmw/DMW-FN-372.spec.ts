import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './helpers/data.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-372',
  name: '후보가 5개를 넘는 검색어로 부르면 자동완성 API 는 5개만 준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    많은검색어: z.string().min(1).describe('후보가 5개를 넘는 검색어 — 상품 이름에 6개 이상 든 낱말').default('트'),
    다섯개검색어: z.string().min(1).describe('후보가 5개인 검색어 — 상품 이름에 정확히 5개가 든 낱말'),
  }),
  expected: null,
  techniques: ['경계값 분석'],
  held: '보류 — 후보가 정확히 5개인 검색어가 상품 데이터에 없다',
});

test(spec, async ({ request, params }) => {
  const 이름들 = (await 상품목록(request)).map((하나) => 하나.name);
  const 후보수 = (낱말: string): number => 이름들.filter((이름) => 이름.includes(낱말)).length;

  await test.step('후보가 많은 검색어로 GET /api/products/suggest 를 부른다', async () => {
    await verify('후보가 5개를 넘는 검색어다', 후보수(params.많은검색어) > 5, true, { blocker: true });
    const 응답 = await request.get(`/api/products/suggest?q=${encodeURIComponent(params.많은검색어)}`);
    await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
    await verify('후보가 5개를 넘는 검색어로 부르면 자동완성 API 는 5개만 준다', ((await 응답.json()) as { items: unknown[] }).items.length, 5);
  });

  await test.step('후보가 5개인 검색어로 GET /api/products/suggest 를 부른다', async () => {
    await verify('후보가 정확히 5개인 검색어다', 후보수(params.다섯개검색어), 5, { blocker: true });
    const 응답 = await request.get(`/api/products/suggest?q=${encodeURIComponent(params.다섯개검색어)}`);
    await verify('응답 코드가 200이다', 응답.status(), 200, { blocker: true });
    await verify('후보가 5개인 검색어로 부르면 자동완성 API 는 5개를 다 준다', ((await 응답.json()) as { items: unknown[] }).items.length, 5);
  });
});
