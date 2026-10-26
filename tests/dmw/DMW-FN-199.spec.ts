import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-199',
  name: '후보가 5개를 넘는 검색어를 적으면 자동완성은 5개만 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: z.object({
    많은검색어: z.string().describe('후보가 5개를 넘는 검색어 — 이름에 6개 이상 들어 있는 글자').default('스'),
    다섯검색어: z.string().describe('후보가 5개 이상 나오는 검색어 — 이름에 5개 이상 들어 있는 글자').default('기'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('후보가 5개를 넘는 검색어를 적는다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.검색어쓰기(params.많은검색어);
    await 목록.자동완성목록.waitFor();
    await verify('후보가 5개를 넘는 검색어를 적으면 자동완성은 5개만 보인다', await 목록.자동완성항목들.count(), 5);
  });

  await test.step('후보가 5개인 검색어를 적는다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.검색어쓰기(params.다섯검색어);
    await 목록.자동완성목록.waitFor();
    await verify('후보가 5개인 검색어를 적으면 자동완성 5개가 다 보인다', await 목록.자동완성항목들.count(), 5);
  });
});
