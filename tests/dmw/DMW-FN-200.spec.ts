import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 응답늦추기, 전체상품이름들 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-200',
  name: '검색어를 바꾸면 마지막 검색어에 맞는 후보만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    처음검색어: z.string().describe('먼저 적는 검색어 — 후보가 1건 이상 나오는 글자').default('데모'),
    마지막검색어: z.string().describe('나중에 바꿔 적는 검색어 — 후보가 1~5개 나오는 글자, 처음 검색어와 다른 것').default('가을'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 목록 = new 상품목록화면(page);
  const 마지막후보 = (await 전체상품이름들(request, (하나) => 하나.name.includes(params.마지막검색어))).sort();
  await 안내창막기(page);
  const 늦춤 = await 응답늦추기(page, new RegExp(`/api/products/suggest\\?q=${encodeURIComponent(params.처음검색어)}$`));

  try {
    await test.step('첫 검색어 응답을 늦춘 채 검색어를 바꾼다', async () => {
      await 목록.열기();
      await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
      const 첫요청 = page.waitForRequest((요청) => 요청.url().includes('/api/products/suggest') && 요청.url().endsWith(encodeURIComponent(params.처음검색어)));
      await 목록.검색어쓰기(params.처음검색어);
      await 첫요청;
      await 목록.검색어쓰기(params.마지막검색어);
      await 목록.자동완성목록.waitFor();
      const 늦은응답 = page.waitForResponse((응답) => 응답.url().includes('/api/products/suggest') && 응답.url().endsWith(encodeURIComponent(params.처음검색어)));
      늦춤.풀기();
      await 늦은응답;
      await verify('검색어를 바꾸면 마지막 검색어에 맞는 후보만 보인다', (await 목록.자동완성글들()).sort().join(', '), 마지막후보.join(', '));
    });
  } finally {
    await 늦춤.끝내기();
  }
});
