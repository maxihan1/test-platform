import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-171',
  name: '자동완성 목록에서 ESC 를 치면 목록이 닫힌다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    searchWord: z.string().describe('검색어 — 상품 이름 일부, 자동완성에 상품이 하나 이상 뜨는 글자').default('니트'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('자동완성 목록이 열린 채 ESC 를 친다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await 목록.검색어적기(params.searchWord);
    await 목록.자동완성.waitFor();
    await verify('자동완성 목록이 열려 있다', await 목록.자동완성.isVisible(), true, { blocker: true });
    await 목록.검색칸.press('Escape');
    await 목록.자동완성.waitFor({ state: 'hidden' });
    await verify('자동완성 목록에서 ESC 를 치면 목록이 닫힌다', await 목록.자동완성.isVisible(), false);
  });

  await test.step('자동완성 목록이 열린 채 바깥을 누른다', async () => {
    await 목록.검색칸.fill('');
    await 목록.검색어적기(params.searchWord);
    await 목록.자동완성.waitFor();
    await verify('자동완성 목록이 열려 있다', await 목록.자동완성.isVisible(), true, { blocker: true });
    await 목록.제목.click();
    await 목록.자동완성.waitFor({ state: 'hidden' });
    await verify('자동완성 목록 바깥을 누르면 목록이 닫힌다', await 목록.자동완성.isVisible(), false);
  });
});
