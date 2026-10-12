import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-134',
  name: '카테고리 둘을 고르면 두 카테고리 상품만 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('카테고리를 하나도 고르지 않은 목록을 연다', async () => {
    await 목록.열기();
    await 목록.첫화면기다리기();
    const 전체수 = (await 상품목록(page.request)).total;
    await verify('카테고리를 고르지 않으면 전체 상품 수가 「총 {N}개」로 보인다', await 목록.총개수.innerText(), '총 ' + String(전체수) + '개');
  });

  await test.step('카테고리 「패션」과 「전자기기」를 고른다', async () => {
    const 기대 = (await 상품목록(page.request)).items.filter((상품줄) => ['패션', '전자기기'].includes(상품줄.category));
    await 목록.카테고리('패션').check();
    await 목록.카테고리('전자기기').check();
    await 목록.총개수.filter({ hasText: '총 ' + String(기대.length) + '개' }).waitFor();
    const 이름들 = await 목록.카드이름들();
    const 허용 = new Set(기대.map((상품줄) => 상품줄.name));
    await verify('카테고리 둘을 고르면 두 카테고리 상품만 보인다', 이름들.length > 0 && 이름들.every((이름) => 허용.has(이름)), true);
  });
});
