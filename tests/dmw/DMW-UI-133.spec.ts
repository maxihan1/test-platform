import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-133',
  name: '상품 목록에 카드가 한 줄에 4개씩 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('상품 목록을 연다', async () => {
    await 목록.화면너비두기(1280);
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('상품 목록에 카드가 한 줄에 4개씩 보인다', await 목록.첫줄카드수(), 4);
  });

  await test.step('화면 너비를 768px 로 두고 상품 목록을 연다', async () => {
    await 목록.화면너비두기(768);
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('화면 너비가 768px 이면 상품 카드가 한 줄에 2개씩 보인다', await 목록.첫줄카드수(), 2);
  });
});
