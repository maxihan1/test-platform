import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-158',
  name: '가격 슬라이더를 150,000원으로 옮기면 150,000원 넘는 상품이 보이지 않는다',
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

  await test.step('상품 목록 화면을 준비한다', async () => {
    await 목록.열기();
  });

  await test.step('상품 목록 첫 화면이 떴는지 확인한다', async () => {
    await 목록.첫화면기다리기();
    await verify('상품 목록 화면에 「쇼핑」 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('가격 슬라이더를 150,000원으로 옮긴다', async () => {
    const 맞는수 = (await 상품목록(page.request)).items.filter((상품) => 상품.salePrice <= 150000).length;
    await 목록.슬라이더맞추기(150000);
    await 목록.총개수.filter({ hasText: `총 ${String(맞는수)}개` }).waitFor();
    const 가격들 = await 목록.판매가들();
    await verify('가격 슬라이더를 150,000원으로 옮기면 150,000원 넘는 상품이 보이지 않는다', 가격들.filter((가격) => 가격 > 150000).length, 0);
  });

  await test.step('가격 슬라이더를 오른쪽 화살표로 한 칸 옮긴다', async () => {
    const 전 = Number((await 목록.가격표시.innerText()).replace(/[^0-9]/g, ''));
    await 목록.가격슬라이더.press('ArrowRight');
    const 후 = Number((await 목록.가격표시.innerText()).replace(/[^0-9]/g, ''));
    await verify('가격 슬라이더는 한 칸에 10,000원씩 움직인다', 후 - 전, 10000);
  });
});
