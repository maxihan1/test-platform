import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 주소검색창 } from './pages/address-popup.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-380',
  name: '주소 검색어 1자로 검색하면 「검색어를 2자 이상 입력하세요」가 보인다',
  precondition: ['새로 가입한 회원이 장바구니에 상품을 담았다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  let 창!: 주소검색창;
  const 주문서 = new 주문서화면(page);

  try {
    await test.step('임시 회원으로 가입해 상품을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      담음 = await 상품담기(page.request, {}, 1);
    });

    await test.step('상품이 담겼는지 확인한다', async () => {
      await verify('장바구니에 담은 상품이 있다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true, { blocker: true });
    });

    await test.step('주문서를 열고 주소 검색 창을 연다', async () => {
      await 주문서.열기([담음.줄번호]);
      창 = new 주소검색창(await 주문서.주소검색열기());
    });

    await test.step('주소 검색 창이 열렸는지 확인한다', async () => {
      await 창.제목.waitFor();
      await verify('주소 검색 창이 열려 있다', await 창.검색어.isEditable(), true, { blocker: true });
    });

    await test.step('주소 검색 창에서 1자로 검색한다', async () => {
      await 창.검색어.fill('강');
      await 창.검색.click();
      await 창.오류.filter({ hasText: /\S/ }).waitFor();
      await verify('주소 검색어 1자로 검색하면 「검색어를 2자 이상 입력하세요」가 보인다', (await 창.오류.innerText()).trim(), '검색어를 2자 이상 입력하세요');
    });

    await test.step('주소 검색 창에서 2자로 검색한다', async () => {
      await 창.검색어.fill('강남');
      await 창.검색.click();
      await 창.결과들.first().waitFor();
      await verify('주소 검색어 2자로 검색하면 검색어 안내 없이 주소 결과가 보인다', (await 창.결과들.count()) > 0 && (await 창.오류.innerText()).trim() === '', true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
