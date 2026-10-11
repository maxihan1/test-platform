import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 상품담기, 상품번호로담기, 둘째회원만들기, 둘째회원정리 } from './helpers/order-tools.helper.js';
import type { 담은상품, 둘째회원 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기, 일요일아닌배송일, 주문하기 } from './helpers/shop.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 주문서화면, 정상배송값 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-228',
  name: '결제하는 사이 재고가 모자라면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다',
  techniques: ['동등 분할', '결정 테이블'],
  precondition: ['새로 가입한 회원이 재고를 모두 담아 최종 확인 단계에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 둘째: 둘째회원 | undefined;
  let 둘째주문번호 = '';
  const 완료 = new 주문완료화면(page);
  const 알림 = new 토스트(page);
  let 담음!: 담은상품;
  const 주문서 = new 주문서화면(page);
  const 배송 = 정상배송값(일요일아닌배송일());

  try {
    await test.step('임시 회원으로 가입해 상품을 담는다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
      담음 = await 상품담기(page.request, { 최소재고: 1, 최대재고: 10 }, '재고전부');
    });

    await test.step('상품이 담겼는지 확인한다', async () => {
      await verify('장바구니에 담은 상품이 있다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true, { blocker: true });
    });

    await test.step('주문서를 열어 둔다', async () => {
      await 주문서.열기([담음.줄번호]);
    });

    await test.step('주문서 배송 정보 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 배송 정보 단계가 열려 있다', (await 주문서.현재단계글()), '① 배송 정보', { blocker: true });
    });

    await test.step('배송 정보를 채워 결제 수단 단계로 간다', async () => {
      await 주문서.배송정보채우기(배송);
      await 주문서.다음누르기();
    });

    await test.step('주문서 결제 수단 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 결제 수단 단계가 열려 있다', (await 주문서.현재단계글()), '② 결제 수단', { blocker: true });
    });

    await test.step('결제 수단을 골라 최종 확인 단계로 간다', async () => {
      await 주문서.결제수단고르기('계좌이체');
      await 주문서.다음누르기();
    });

    await test.step('주문서 최종 확인 단계가 열렸는지 확인한다', async () => {
      await verify('주문서 최종 확인 단계가 열려 있다', (await 주문서.현재단계글()), '③ 최종 확인', { blocker: true });
    });

    await test.step('다른 회원이 그 상품 하나를 산 뒤 「{금액}원 결제하기」를 누른다', async () => {
      둘째 = await 둘째회원만들기();
      둘째주문번호 = (await 주문하기(둘째.api, [await 상품번호로담기(둘째.api, 담음.상품.id)])).id;
      await 주문서.동의.check();
      await 주문서.결제하기.click();
      await 알림.알림들.first().waitFor();
      await verify('결제하는 사이 재고가 모자라면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다', await 알림.글('재고가 부족한 상품이 있습니다: ' + 담음.상품.name).isVisible(), true);
      await verify('재고가 모자라면 주문 완료 화면으로 가지 않는다', await 완료.제목.isVisible(), false);
    });
  } finally {
    await 둘째회원정리(둘째, 둘째주문번호 === '' ? [] : [둘째주문번호]);
    await 탈퇴(page.request);
  }
});
