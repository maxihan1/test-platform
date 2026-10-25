import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-189',
  name: '가격 슬라이더를 한 칸 움직이면 값이 10,000원 바뀐다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  await 안내창막기(page);

  await test.step('가격 슬라이더를 한 칸 올린다', async () => {
    await 목록.열기();
    await verify('화면 제목 「쇼핑」이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
    await 목록.최대가격두기(100000);
    const 전 = await 목록.최대가격읽기();
    await 목록.최대가격키로올리기();
    const 후 = await 목록.최대가격읽기();
    await verify('가격 슬라이더를 한 칸 움직이면 값이 10,000원 바뀐다', 후 - 전, 10000);
  });
});
