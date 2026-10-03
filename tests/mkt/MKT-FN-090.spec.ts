import type { Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-090',
  name: '입력이 바뀌면 마지막 입력에 맞는 결과만 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '앞 입력의 자동완성 응답이 뒤 입력보다 늦게 온다(모킹)'],
  params: z.object({
    firstQuery: z.string().min(1).describe('앞 검색어').default('무선'),
    lastQuery: z.string().min(1).describe('마지막 검색어').default('데모'),
    delayMs: z.number().describe('앞 입력 응답을 늦추는 시간(밀리초)').default(1500),
  }),
  expected: z.object({
    onlyLast: z.boolean().describe('마지막 입력에 맞는 결과만 보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 목록 = new 상품목록(page);
  const 늦추기 = async (route: Route): Promise<void> => {
    const 검색어 = new URL(route.request().url()).searchParams.get('q');
    if (검색어 === params.firstQuery) await new Promise((끝) => setTimeout(끝, params.delayMs));
    await route.fulfill({ response: await route.fetch() });
  };
  await page.context().route('**/api/products/suggest*', 늦추기);

  try {
    await test.step('상품 검색칸에 글자를 이어서 바꿔 적는다', async () => {
      await 목록.열고기다린다();
      const 늦은응답 = page.waitForResponse((응답) => 응답.url().includes(`q=${encodeURIComponent(params.firstQuery)}`));
      await 목록.검색칸.fill(params.firstQuery);
      await page.waitForTimeout(500);
      await 목록.검색칸.fill(params.lastQuery);
      await 목록.자동완성목록.waitFor();
      await 늦은응답;
      await page.waitForTimeout(300);
      const 이름들 = await 목록.자동완성항목들.allInnerTexts();
      await verify(
        '입력이 바뀌면 마지막 입력에 맞는 결과만 보인다',
        이름들.length > 0 && 이름들.every((이름) => 이름.includes(params.lastQuery)),
        expected.onlyLast,
      );
    });
  } finally {
    await page.context().unroute('**/api/products/suggest*', 늦추기);
  }
});
