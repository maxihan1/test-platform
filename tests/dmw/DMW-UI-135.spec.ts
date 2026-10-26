import { defineCase, test, verify } from '@platform/kit';

import { 빨간색인가, 할인상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-135',
  name: '할인 상품 카드의 원래 가격에 가운데 줄이 그어져 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 목록 = new 상품목록화면(page);
  const 상품 = await 할인상품(request);
  await 안내창막기(page);

  await test.step('할인 상품 카드를 확인한다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('할인 상품 카드의 원래 가격에 가운데 줄이 그어져 보인다', await 목록.줄긋기인가(목록.카드원가(목록.카드(상품.name))), true);
  });

  await test.step('할인 상품 카드의 할인 가격을 확인한다', async () => {
    await verify('할인 상품 카드의 할인 가격이 빨간 글자로 보인다', 빨간색인가(await 목록.글자색(목록.카드할인가(목록.카드(상품.name)))), true);
  });
});
