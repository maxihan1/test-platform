import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-148',
  name: '자동완성 후보를 누르면 그 상품 상세가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    검색어: z.string().describe('상품 검색어 — 이름에 들어 있는 글자, 후보가 한 건 이상 나오는 것').default('데모'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  const 상세 = new 상품상세화면(page);
  await 안내창막기(page);

  await test.step('자동완성 후보를 누른다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.검색어쓰기(params.검색어);
    await 목록.자동완성항목들.first().waitFor();
    const 후보 = (await 목록.자동완성글들())[0];
    await 목록.자동완성항목들.first().click();
    await 상세.다그려질때까지();
    await verify('자동완성 후보를 누르면 그 상품 상세가 보인다', await 상세.제목.innerText(), 후보);
  });
});
