import { defineCase, test, verify } from '@platform/kit';

import { 임시회원로그인, type 임시회원 } from './components/account.component.js';
import { 상품번호, 상품조회, 장바구니조회 } from './components/data.component.js';
import { 회원정리 } from './components/shop-helpers.component.js';
import { 토스트 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-271',
  name: '장바구니에 담으면 토스트 「장바구니에 담았습니다」가 보인다',
  platforms: ['desktop'],
  precondition: ['새로 만든 회원으로 로그인해 있다', '장바구니가 비어 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);
  const 내것: { 회원?: 임시회원 } = {};

  try {
    await test.step('새로 만든 회원으로 로그인해 옵션이 있는 상품 상세를 연다', async () => {
      내것.회원 = await 임시회원로그인(page.request);
      await 안내창끄기(page, { 공지: false, 설문: false });
      await 상세.열기(상품번호.니트가디건);
      await 머리.로그아웃버튼.waitFor();
      await verify('새로 만든 회원으로 로그인해 있다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('장바구니가 비어 있다', (await 장바구니조회(page.request)).length, 0, { blocker: true });
    });

    await test.step('옵션이 있는 상품의 색상과 사이즈를 고르고 「장바구니 담기」를 누른다', async () => {
      await 상세.옵션고르기();
      await 상세.장바구니담기버튼.click();
      await 알림.기다리기('장바구니에 담았습니다');
      await verify('장바구니에 담으면 토스트 「장바구니에 담았습니다」가 보인다', await 알림.문구('장바구니에 담았습니다').first().isVisible(), true);
      await 머리.장바구니배지.waitFor();
      await verify('머리글 장바구니 배지가 「1」로 바뀐다', await 머리.장바구니배지.innerText(), '1');
      await 알림.전부.first().waitFor({ state: 'detached' });
    });

    await test.step('같은 색상과 사이즈로 「장바구니 담기」를 한 번 더 누른다', async () => {
      await 상세.장바구니담기누르고장바구니갱신기다리기();
      await verify('같은 상품 · 같은 옵션을 다시 담아도 배지는 「1」 그대로다', await 머리.장바구니배지.innerText(), '1');
    });

    await test.step('장바구니 화면을 연다', async () => {
      const 상품 = await 상품조회(page.request, 상품번호.니트가디건);
      await 장바구니.열기();
      await 장바구니.줄수량칸(상품.name).waitFor();
      await verify('장바구니 그 줄의 수량이 2로 더해져 있다', await 장바구니.줄수량칸(상품.name).inputValue(), '2');
    });
  } finally {
    if (내것.회원) await 회원정리(page.request, 내것.회원);
  }
});
