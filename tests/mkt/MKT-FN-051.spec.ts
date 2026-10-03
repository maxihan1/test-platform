import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

import { 로그인폼 } from './components/login-form.component.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

const 예시비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

function 가입본문(아이디: string, 이름: string) {
  return {
    loginId: 아이디,
    password: 예시비밀번호,
    passwordConfirm: 예시비밀번호,
    name: 이름,
    email: `${아이디}@example.com`,
    phone: '',
    birth: '',
    gender: '선택 안 함',
    interests: [],
    terms: true,
    privacy: true,
    marketing: false,
  };
}

function 날짜글자(날: Date): string {
  const 두자리 = (수: number) => String(수).padStart(2, '0');
  return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
}

function 배송희망일(): string {
  const 날 = new Date();
  날.setDate(날.getDate() + 4);
  if (날.getDay() === 0) 날.setDate(날.getDate() + 1);
  return 날짜글자(날);
}

async function 탈퇴로치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
  if (로그인.ok()) await request.delete('/api/me');
}

export const spec = defineCase({
  tcId: 'MKT-FN-051',
  name: '「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀌고 그 상품의 재고가 주문 수량만큼 되돌아온다',
  precondition: ['이번 실행에서 가입한 회원이 「결제완료」 주문을 한 건 만들었다'],
  params: z.object({
    productId: z.number().describe('주문할 상품 번호').default(36),
  }),
  expected: z.object({
    paid: z.string().describe('만든 주문의 처음 상태').default('결제완료'),
    cancelled: z.string().describe('취소 뒤 주문 상태').default('주문취소'),
    quantity: z.number().describe('주문 수량').default(1),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 상세 = new 주문상세화면(page);
  const 아이디 = 새아이디();
  let 주문번호 = '';
  let 주문뒤재고 = 0;

  const 재고 = async (): Promise<number> => {
    const 응답 = await page.request.get(`/api/products/${params.productId}`);
    return ((await 응답.json()) as { stock: number }).stock;
  };

  try {
    await test.step('이번 실행에서 가입한 회원이 「결제완료」 주문을 한 건 만든다', async () => {
      await request.post('/api/auth/signup', { data: 가입본문(아이디, '마켓회원') });
      await new 로그인폼(page).로그인한다(아이디, 예시비밀번호);
      const 담기 = await page.request.post('/api/cart', { data: { productId: params.productId, color: '', size: '', qty: expected.quantity } });
      const 줄번호 = ((await 담기.json()) as { id: number }).id;
      const 배송 = { receiver: '마켓회원', phone: '01012345678', zipcode: '06236', address: '서울 강남구 테헤란로 123', detail: '101호', request: '', deliveryDate: 배송희망일() };
      const 주문 = await page.request.post('/api/orders', {
        data: { shipping: 배송, payment: { method: '계좌이체', cardCompany: '', installment: '' }, couponId: null, cartItemIds: [줄번호] },
      });
      주문번호 = ((await 주문.json()) as { id: string }).id;
      주문뒤재고 = await 재고();
      const 만든주문 = await page.request.get(`/api/orders/${encodeURIComponent(주문번호)}`);
      await verify('이번 실행에서 가입한 회원이 「결제완료」 주문을 한 건 만들었다', ((await 만든주문.json()) as { status?: string }).status, expected.paid, { blocker: true });
    });

    await test.step('주문 상세에서 사유를 고르고 「취소 신청」을 누른다', async () => {
      await 상세.열기(주문번호);
      await 상세.취소모달을연다();
      await 상세.사유를고른다('단순 변심');
      await 상세.취소신청버튼.click();
      await 상세.주문취소버튼.waitFor({ state: 'detached' });
      await verify('「취소 신청」을 누르면 주문 상태가 「주문취소」로 바뀐다', await 상세.상태글자.innerText(), expected.cancelled);
      await verify('주문을 취소하면 그 상품의 재고가 주문 수량만큼 되돌아온다', (await 재고()) - 주문뒤재고, expected.quantity);
    });
  } finally {
    await 탈퇴로치운다(request, 아이디);
  }
});
