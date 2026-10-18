import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 전체상품 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-209',
  name: '카테고리 「도서」 · 「식품」을 켜면 그 두 카테고리 상품만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    firstCategory: z.string().describe('먼저 켤 카테고리 — 패션, 전자기기, 도서, 식품 중 하나').default('도서'),
    secondCategory: z.string().describe('같이 켤 카테고리 — 먼저 켠 것과 다른 카테고리').default('식품'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 상품목록화면(page);
  const 상품들 = await 전체상품(page.request);
  const 허용 = 상품들.filter((상품) => [params.firstCategory, params.secondCategory].includes(상품.category)).map((상품) => 상품.name);

  await test.step('카테고리 「도서」 · 「식품」을 켠다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('상품 목록 화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.카테고리(params.firstCategory).check();
    await 목록.카테고리(params.secondCategory).check();
    await 목록.목록다시나올때까지();
    const 이름들 = await 목록.카드상품명들읽기();
    const 밖 = 이름들.filter((이름) => !허용.includes(이름));
    await verify('카테고리 「도서」 · 「식품」을 켜면 그 두 카테고리 상품만 보인다', `허용 밖 ${밖.length}개, 카드 ${이름들.length}개`, `허용 밖 0개, 카드 ${Math.min(12, 허용.length)}개`);
  });

  await test.step('카테고리를 모두 끈다', async () => {
    await 목록.카테고리(params.firstCategory).uncheck();
    await 목록.카테고리(params.secondCategory).uncheck();
    await 목록.목록다시나올때까지();
    await verify('카테고리를 하나도 고르지 않으면 전체 상품 수가 「총 N개」로 보인다', await 목록.총개수.innerText(), `총 ${상품들.length}개`);
  });
});
