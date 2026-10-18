import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 전체상품 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-217',
  name: '필터를 바꾸면 목록이 처음 12개부터 다시 나오고 「총 N개」가 도서 상품 수로 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    category: z.string().describe('켤 카테고리 — 패션, 전자기기, 도서, 식품 중 하나').default('도서'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  const 수 = (await 전체상품(page.request)).filter((상품) => 상품.category === params.category).length;

  await test.step('목록을 내린 뒤 카테고리 「도서」를 켠다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await 목록.끝으로내리기();
    await 목록.카드들.nth(23).waitFor();
    await verify('상품 목록이 24개까지 내려와 있다', await 목록.카드들.count(), 24, { blocker: true });
    await 목록.카테고리(params.category).check();
    await 목록.목록다시나올때까지();
    await verify('필터를 바꾸면 목록이 처음 12개부터 다시 나오고 「총 N개」가 도서 상품 수로 바뀐다', `${await 목록.카드들.count()}개, ${await 목록.총개수.innerText()}`, `${Math.min(12, 수)}개, 총 ${수}개`);
  });
});
