import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-098',
  name: '체크한 상품 금액 합이 50,000원 이상이면 배송비가 0원이다',
  platforms: ['desktop'],
  precondition: ['새로 가입한 회원이 합계 50,000원 이상인 상품을 담아 로그인해 있다', '새로 가입한 회원이 합계 50,000원 미만인 상품을 담아 로그인해 있다'],
  params: z.object({
    cheapId: z.number().describe('50,000원 미만 상품 번호').default(34),
    cheapName: z.string().min(1).describe('50,000원 미만 상품 이름').default('USB-C 허브'),
    pricyId: z.number().describe('둘째 상품 번호').default(20),
    pricyName: z.string().min(1).describe('둘째 상품 이름').default('한우 불고기 세트'),
  }),
  expected: z.object({
    freeFee: z.string().describe('50,000원 이상 배송비').default('0원'),
    paidFee: z.string().describe('50,000원 미만 배송비').default('3,000원'),
    hint: z.string().describe('무료 배송 안내').default('37,100원 더 담으면 무료 배송'),
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

async function 담는다(page: Page, 상품번호: number, 수량: number, 색상 = '', 사이즈 = ''): Promise<void> {
  const 응답 = await page.request.post('/api/cart', { data: { productId: 상품번호, color: 색상, size: 사이즈, qty: 수량 } });
  if (!응답.ok()) throw new Error(`담기 실패 ${응답.status()}`);
}

test(spec, async ({ page, params, expected }) => {
  const 장바구니 = new 장바구니화면(page);
  await page.context().addInitScript(() => {
    window.localStorage.setItem('dm_cookie_ok', '1');
  });

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 상품 두 줄을 담는다', async () => {
      await 가입하고로그인한다(page, 새아이디());
      await 담는다(page, params.cheapId, 1);
      await 담는다(page, params.pricyId, 1);
    });

    await test.step('장바구니 결제 요약을 읽는다', async () => {
      await 장바구니.열기();
      await 장바구니.줄이나타나기를기다린다();
      await verify('장바구니에 두 줄이 담겨 있다', await 장바구니.줄들.count(), 2, { blocker: true });
      await 장바구니.줄체크(params.pricyName).uncheck();
      await verify('체크한 상품 금액 합이 50,000원 미만이면 배송비가 3,000원이다', await 장바구니.배송비.innerText(), expected.paidFee);
      await verify('50,000원 미만일 때는 「{부족한 금액}원 더 담으면 무료 배송」이 보인다', await 장바구니.무료배송안내.innerText(), expected.hint);
      await 장바구니.줄체크(params.pricyName).check();
      await verify('체크한 상품 금액 합이 50,000원 이상이면 배송비가 0원이다', await 장바구니.배송비.innerText(), expected.freeFee);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
