import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-149',
  name: '자동완성 목록은 ESC 를 치면 닫힌다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    검색어: z.string().describe('상품 검색어 — 이름에 들어 있는 글자, 후보가 한 건 이상 나오는 것').default('데모'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('자동완성 목록이 열린 채 ESC 를 친다', async () => {
    await 목록.열기();
    await 목록.검색어쓰기(params.검색어);
    await 목록.자동완성목록.waitFor();
    await verify('자동완성 목록이 열려 있다', await 목록.자동완성목록.isVisible(), true, { blocker: true });
    await 목록.검색칸.press('Escape');
    await verify('자동완성 목록은 ESC 를 치면 닫힌다', await 목록.자동완성목록.isVisible(), false);
  });

  await test.step('자동완성 목록이 열린 채 바깥을 누른다', async () => {
    await 목록.열기();
    await 목록.검색어쓰기(params.검색어);
    await 목록.자동완성목록.waitFor();
    await verify('자동완성 목록이 다시 열려 있다', await 목록.자동완성목록.isVisible(), true, { blocker: true });
    await 목록.제목.click();
    await verify('자동완성 목록은 바깥을 누르면 닫힌다', await 목록.자동완성목록.isVisible(), false);
  });
});
