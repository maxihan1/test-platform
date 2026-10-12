import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 옵션있는상품 } from './helpers/shop-tools.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-155',
  name: '「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 보인다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 토스 = new 토스트(page);
  const 머리 = new 머리글(page);

  const 상품 = await 옵션있는상품(page.request);

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    await test.step('상품 상세 화면을 준비한다', async () => {
      await 상세.열기(상품.id);
    });

    await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
      await 상세.화면기다리기();
      await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    });

    await test.step('옵션을 고르고 「장바구니 담기」를 누른 뒤 머리글을 확인한다', async () => {
      const 전 = (await 장바구니보기(page.request)).length;
      await 상세.옵션고르기(상품.colors?.[0], 상품.sizes?.[0]);
      await 상세.담기.click();
      await 토스.글('장바구니에 담았습니다').first().waitFor();
      await 머리.장바구니배지.waitFor();
      await verify('「장바구니 담기」를 누르면 머리글 장바구니 배지 숫자가 1 늘어난다', Number(await 머리.장바구니배지.innerText()), 전 + 1);
    });

    await test.step('옵션을 고르고 「장바구니 담기」를 누른다', async () => {
      const 토스트수 = await 토스.알림들.count();
      await 상세.담기.click();
      await 토스.알림들.nth(토스트수).waitFor();
      await verify('「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 보인다', await 토스.글('장바구니에 담았습니다').last().isVisible(), true);
    });
  } finally {
    await 임시회원치우기(page.request);
  }
});
