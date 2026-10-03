import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니화면 } from './pages/cart.page.js';
import { 주문완료 } from './pages/checkout-done.page.js';
import { 주문서 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-103',
  name: '최종 결제 금액은 상품 금액에서 쿠폰 할인을 빼고 배송비를 더한 값이다',
  platforms: ['desktop'],
  precondition: [
    '새로 가입한 회원이 50,000원 미만 상품을 담고 쿠폰 「3,000원 할인」을 골라 3단계에 왔다',
    '새로 가입한 회원이 상품 한 줄을 담고 1·2단계를 채워 3단계에 왔다',
    '새로 가입한 회원이 상품 한 줄을 담고 1·2단계를 채워 3단계에 동의까지 체크했다',
  ],
  params: z.object({
    productId: z.number().describe('50,000원 미만 상품 번호').default(20),
    productName: z.string().min(1).describe('상품 이름').default('한우 불고기 세트'),
    receiver: z.string().min(1).describe('받는 분').default('홍길동'),
    phone: z.string().min(1).describe('연락처').default('01012345678'),
    detail: z.string().min(1).describe('상세 주소').default('101호'),
  }),
  expected: z.object({
    total: z.string().describe('최종 결제 금액').default('47,900원'),
    shippingFee: z.string().describe('배송비').default('3,000원'),
    stockDrop: z.number().describe('줄어드는 재고').default(1),
  }),
});

const 계정비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

async function 가입하고로그인한다(page: Page, 아이디: string): Promise<void> {
  const 가입 = await page.request.post('/api/auth/signup', {
    data: {
      loginId: 아이디,
      password: 계정비밀번호,
      passwordConfirm: 계정비밀번호,
      name: '쇼핑시험',
      email: `${아이디}@example.com`,
      phone: '',
      birth: '1990-01-01',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  if (!가입.ok()) throw new Error(`가입 실패 ${가입.status()}`);
  const 로그인 = await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 계정비밀번호, remember: false } });
  if (!로그인.ok()) throw new Error(`로그인 실패 ${로그인.status()}`);
}

async function 재고를읽는다(page: Page, 상품번호: number): Promise<number> {
  const 응답 = await page.request.get(`/api/products/${상품번호}`);
  return ((await 응답.json()) as { stock: number }).stock;
}

test(spec, async ({ page, params, expected }) => {
  const 주문 = new 주문서(page);
  const 완료 = new 주문완료(page);
  const 장바구니 = new 장바구니화면(page);
  let 주문번호 = '';
  await page.context().addInitScript(() => {
    window.localStorage.setItem('dm_cookie_ok', '1');
  });

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 상품 한 줄을 담는다', async () => {
      await 가입하고로그인한다(page, 새아이디());
      const 응답 = await page.request.post('/api/cart', { data: { productId: params.productId, color: '', size: '', qty: 1 } });
      if (!응답.ok()) throw new Error(`담기 실패 ${응답.status()}`);
      const 줄번호 = ((await 응답.json()) as { id: number }).id;
      await 주문.열기(`?items=${줄번호}`);
    });

    const 재고전 = await 재고를읽는다(page, params.productId);

    await test.step('배송 정보와 결제 수단과 쿠폰을 채워 3단계로 간다', async () => {
      await 주문.배송정보를채운다({ 받는분: params.receiver, 연락처: params.phone, 상세주소: params.detail, 배송희망일: 주문.평일배송희망일() });
      await 주문.둘째단계로간다();
      await 주문.결제수단('무통장입금').check();
      await 주문.쿠폰.selectOption({ label: '3,000원 할인 (30,000원 이상 구매 시)' });
      await 주문.셋째단계로간다();
    });

    await test.step('최종 확인의 금액을 읽는다', async () => {
      await 주문.최종확인금액.waitFor();
      await verify('최종 결제 금액은 상품 금액에서 쿠폰 할인을 빼고 배송비를 더한 값이다', await 주문.최종확인금액줄('최종 결제 금액').innerText(), expected.total);
    });

    await test.step('최종 확인의 배송비를 읽는다', async () => {
      await verify('배송비는 쿠폰을 적용하기 전 상품 금액을 기준으로 정한다', await 주문.최종확인금액줄('배송비').innerText(), expected.shippingFee);
    });

    await test.step('「주문 내용을 확인했으며 결제에 동의합니다」를 체크한다', async () => {
      await 주문.약관동의.check();
      await verify('「주문 내용을 확인했으며 결제에 동의합니다」를 체크하면 「{금액}원 결제하기」 버튼이 눌린다', await 주문.결제하기.isEnabled(), true);
    });

    await test.step('「{금액}원 결제하기」를 누른다', async () => {
      await 주문.결제하기.click();
      await 완료.제목.waitFor();
      주문번호 = await 완료.주문번호.innerText();
      await verify('결제하면 주문 완료 화면에 주문번호가 「DM」과 날짜 8자리와 「-」와 숫자 4자리 형식으로 보인다', /^DM\d{8}-\d{4}$/.test(주문번호), true);
      await verify(
        '주문 완료 화면에 결제 금액과 「주문 내역 보기」 · 「쇼핑 계속하기」 버튼이 보인다',
        { 결제금액: await 완료.결제금액.innerText(), 주문내역보기: await 완료.주문내역보기.isVisible(), 쇼핑계속하기: await 완료.쇼핑계속하기.isVisible() },
        { 결제금액: expected.total, 주문내역보기: true, 쇼핑계속하기: true },
      );
    });

    await test.step('「{금액}원 결제하기」를 누르고 장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      await 장바구니.비어있음을기다린다();
      await verify('주문한 상품은 장바구니에서 빠진다', await 장바구니.줄(params.productName).count(), 0);
    });

    await test.step('「{금액}원 결제하기」를 누르고 그 상품의 재고를 다시 읽는다', async () => {
      const 재고후 = await 재고를읽는다(page, params.productId);
      await verify('상품 재고가 주문 수량만큼 줄어든다', 재고전 - 재고후, expected.stockDrop);
    });
  } finally {
    if (주문번호 !== '') {
      await page.request.post(`/api/orders/${encodeURIComponent(주문번호)}/cancel`, { data: { reason: '단순 변심', detail: '' } });
    }
    await page.request.delete('/api/me');
  }
});
