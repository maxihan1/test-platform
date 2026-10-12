import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 빨간색인가 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-176',
  name: '할인 상품 카드의 원래 가격에 가운데 줄이 그어져 보인다',
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

  await test.step('상품 목록을 연다', async () => {
    await 목록.열기();
    await 목록.첫화면기다리기();
    const 줄들 = await 목록.할인카드원가줄들();
    await verify('할인 상품 카드의 원래 가격에 가운데 줄이 그어져 보인다', 줄들.length > 0 && 줄들.every((줄) => 줄.includes('line-through')), true);
    const 색들 = await 목록.할인카드가격색들();
    await verify('할인 상품 카드의 할인 가격이 빨간 글자로 보인다', 색들.length > 0 && 색들.every(빨간색인가), true);
  });
});
