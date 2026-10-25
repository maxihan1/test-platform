import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 화면제목 } from './components/page-heading.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-352',
  name: '장바구니에서 「주문하기」를 누르면 주문서가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 장바구니 = new 장바구니화면(page);
  const 상세 = new 상품상세화면(page);
  const 주문서 = new 주문서화면(page);
  const 확인창 = new 모달(page, '확인');
  const 제목 = new 화면제목(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  await 상품담기(page.request, 상품, 1);

  try {
    await test.step('장바구니의 「주문하기」를 누른다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 하나 보인다', await 장바구니.줄들.count(), 1, { blocker: true });
      await 장바구니.주문하기.click();
      await 제목.글('주문서').waitFor();
      await verify('장바구니에서 「주문하기」를 누르면 주문서가 보인다', await 주문서.제목.isVisible(), true);
    });

    await test.step('장바구니 줄의 상품명을 누른다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 하나 보인다', await 장바구니.줄들.count(), 1, { blocker: true });
      await 장바구니.줄상품명링크(상품.name).click();
      await 상세.다그려질때까지();
      await verify('장바구니에서 상품명을 누르면 그 상품 상세가 보인다', await 상세.제목.innerText(), 상품.name);
    });

    await test.step('선택 삭제 확인 창의 「취소」를 누른다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 줄이 하나 보인다', await 장바구니.줄들.count(), 1, { blocker: true });
      await 장바구니.선택삭제.click();
      await 확인창.뜰때까지();
      await 확인창.버튼('취소').click();
      await 확인창.사라질때까지();
      await verify('장바구니에서 선택 삭제 확인 창 「취소」를 누르면 확인 창이 닫힌다', await 확인창.창.count(), 0);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
