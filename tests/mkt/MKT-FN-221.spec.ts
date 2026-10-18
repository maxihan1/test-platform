import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 자동완성결과수, 전체상품 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-221',
  name: '자동완성 결과가 5개인 검색어면 자동완성 목록에 5개가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    fiveWord: z.string().describe('자동완성 결과가 5개인 검색어 — 상품 이름 일부').default('트'),
    manyWord: z.string().describe('자동완성 결과가 6개 이상인 검색어 — 이름에 들어간 상품이 6개 이상인 글자').default('기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('자동완성 결과가 5개인 검색어를 적고 0.3초 기다린다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('자동완성 결과가 5개다', await 자동완성결과수(page.request, params.fiveWord), 5, { blocker: true });
    await 목록.검색어적기(params.fiveWord);
    await 목록.자동완성.waitFor();
    await verify('자동완성 결과가 5개인 검색어면 자동완성 목록에 5개가 보인다', await 목록.자동완성항목.count(), 5);
  });

  await test.step('자동완성 결과가 6개 이상인 검색어를 적고 0.3초 기다린다', async () => {
    const 이름들 = (await 전체상품(page.request)).map((상품) => 상품.name);
    await verify('검색어가 이름에 든 상품이 6개 이상이다', 이름들.filter((이름) => 이름.includes(params.manyWord)).length >= 6, true, { blocker: true });
    await 목록.열기();
    await 목록.검색어적기(params.manyWord);
    await 목록.자동완성.waitFor();
    await verify('자동완성 결과가 6개 이상인 검색어여도 자동완성 목록에는 5개까지만 보인다', await 목록.자동완성항목.count(), 5);
  });
});
