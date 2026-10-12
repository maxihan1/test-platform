import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 임시회원치우기, 재고부족응답, 주문응답모킹 } from './helpers/shop-extra.helper.js';
import { 상품담기 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 기다려보기 } from './helpers/shop-tools.helper.js';
import { 일요일아닌배송일, 장바구니보기 } from './helpers/shop.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';
import { 정상배송값, 주문서화면 } from './pages/checkout.page.js';
import type { 담은상품 } from './helpers/order-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-196',
  name: '결제하는 사이 재고가 모자라면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다',
  techniques: ['동등 분할', '결정 테이블'],
  precondition: ['주문 응답은 재고 부족 409 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 담음!: 담은상품;
  const 주문서 = new 주문서화면(page);
  const 배송 = 정상배송값(일요일아닌배송일());
  const 완료 = new 주문완료화면(page);
  const 알림 = new 토스트(page);
  let 모킹 = undefined as { 걸린수: () => number; 풀기: () => Promise<void> } | undefined;

  try {
    try {
      await test.step('임시 회원으로 가입해 상품을 담는다', async () => {
        await 방해막기(page);
        await 새회원으로로그인(page.request);
        담음 = await 상품담기(page.request, {}, 1);
      });

      await test.step('상품이 담겼는지 확인한다', async () => {
        await verify('장바구니에 담은 상품이 있다', (await 장바구니보기(page.request)).some((줄) => 줄.id === 담음.줄번호), true, { blocker: true });
      });

      await test.step('주문서를 열어 둔다', async () => {
        await 주문서.열기([담음.줄번호]);
      });

      await test.step('주문서 배송 정보 단계가 열렸는지 확인한다', async () => {
        await verify('주문서 배송 정보 단계가 열려 있다', await 주문서.현재단계글(), '① 배송 정보', { blocker: true });
      });

      await test.step('배송 정보를 채워 결제 수단 단계로 간다', async () => {
        await 주문서.배송정보채우기(배송);
        await 주문서.다음누르기();
      });

      await test.step('주문서 결제 수단 단계가 열렸는지 확인한다', async () => {
        await verify('주문서 결제 수단 단계가 열려 있다', await 주문서.현재단계글(), '② 결제 수단', { blocker: true });
      });

      await test.step('결제 수단을 골라 최종 확인 단계로 간다', async () => {
        await 주문서.결제수단고르기('계좌이체');
        await 주문서.다음누르기();
      });

      await test.step('주문서 최종 확인 단계가 열렸는지 확인한다', async () => {
        await verify('주문서 최종 확인 단계가 열려 있다', await 주문서.현재단계글(), '③ 최종 확인', { blocker: true });
      });

      await test.step('주문 응답을 재고 부족 409 가짜 응답으로 바꾼다', async () => {
        모킹 = await 주문응답모킹(page, await 재고부족응답(page.request, 담음.상품));
      });

      await test.step('3단계에서 동의를 켜고 「결제하기」를 누른다', async () => {
        const 문구 = '재고가 부족한 상품이 있습니다: ' + 담음.상품.name;
        await 주문서.동의.check();
        await 주문서.결제하기.click();
        await 기다려보기(알림.글(문구).first().waitFor({ timeout: 10000 }));
        await verify('주문 요청이 가짜 응답으로 돌아갔다', (모킹?.걸린수() ?? 0) > 0, true, { blocker: true });
        await verify('결제하는 사이 재고가 모자라면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다', await 알림.글(문구).first().isVisible(), true);
      });

      await test.step('「결제하기」를 누른 뒤 화면을 확인한다', async () => {
        await verify('재고가 모자라면 주문 완료 화면으로 가지 않는다', (await 완료.제목.isVisible()) || new URL(page.url()).pathname === '/checkout/done', false);
      });
    } finally {
      await 모킹?.풀기();
    }
  } finally {
    await 임시회원치우기(page.request, true);
  }
});
