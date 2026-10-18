import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-170',
  name: '자동완성 항목을 누르면 그 상품 상세로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    searchWord: z.string().describe('검색어 — 상품 이름 일부, 자동완성에 상품이 하나 이상 뜨는 글자').default('니트'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  const 상세 = new 상품상세화면(page);

  await test.step('검색칸에 「니트」를 적고 자동완성 항목을 누른다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.검색어적기(params.searchWord);
    const 항목 = 목록.자동완성항목.first();
    await 항목.waitFor();
    const 이름 = await 항목.innerText();
    await 항목.click();
    await 상세.큰이미지버튼.waitFor();
    await verify('자동완성 항목을 누르면 그 상품 상세로 간다', await 상세.제목.innerText(), 이름);
  });
});
