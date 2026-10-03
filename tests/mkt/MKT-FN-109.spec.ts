import { defineCase, test, verify } from '@platform/kit';

import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-109',
  name: '자동완성 목록이 펼쳐져 있을 때 ESC 를 치거나 검색칸 바깥을 누르면 닫힌다',
  precondition: ['자동완성 목록이 펼쳐져 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('키보드 ESC 를 친다', async () => {
    await 목록.열기();
    await 목록.제목().waitFor();
    await 목록.검색어적기('트');
    await 목록.자동완성항목들().first().waitFor();
    await verify('자동완성 목록이 펼쳐져 있다', await 목록.자동완성목록().isVisible(), true, { blocker: true });
    await page.keyboard.press('Escape');
    await 목록.자동완성목록().waitFor({ state: 'hidden' });
    await verify('ESC 를 치면 자동완성 목록이 닫힌다', await 목록.자동완성목록().isVisible(), false);
  });

  await test.step('검색칸 바깥을 누른다', async () => {
    await 목록.검색어적기('트');
    await 목록.자동완성항목들().first().waitFor();
    await verify('자동완성 목록이 펼쳐져 있다', await 목록.자동완성목록().isVisible(), true, { blocker: true });
    await 목록.제목().click();
    await 목록.자동완성목록().waitFor({ state: 'hidden' });
    await verify('검색칸 바깥을 누르면 자동완성 목록이 닫힌다', await 목록.자동완성목록().isVisible(), false);
  });
});
