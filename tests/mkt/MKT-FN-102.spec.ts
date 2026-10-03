import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 주문서 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-102',
  name: '결제 금액이 50,000원 이상이면 할부를 고를 수 있다',
  platforms: ['desktop'],
  precondition: ['결제 금액이 50,000원 이상인 상품을 담고 「신용카드」를 골랐다'],
  params: z.object({
    productId: z.number().describe('50,000원 이상 상품 번호').default(2),
    receiver: z.string().min(1).describe('받는 분').default('홍길동'),
    phone: z.string().min(1).describe('연락처').default('01012345678'),
    detail: z.string().min(1).describe('상세 주소').default('101호'),
  }),
  expected: z.object({
    pickedInstallment: z.string().describe('고른 할부').default('6개월'),
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

test(spec, async ({ page, params, expected }) => {
  const 주문 = new 주문서(page);
  await page.context().addInitScript(() => {
    window.localStorage.setItem('dm_cookie_ok', '1');
  });

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 로그인한다', async () => {
      await 가입하고로그인한다(page, 새아이디());
    });

    await test.step('배송 정보를 채우고 「신용카드」를 골라 주문서 2단계로 간다', async () => {
      await 주문.바로구매로열기(params.productId, 1);
      await 주문.배송정보를채운다({ 받는분: params.receiver, 연락처: params.phone, 상세주소: params.detail, 배송희망일: 주문.평일배송희망일() });
      await 주문.둘째단계로간다();
      await 주문.결제수단('신용카드').check();
      await 주문.할부.waitFor();
    });

    await test.step('할부 드롭다운을 연다', async () => {
      await 주문.할부.selectOption({ label: expected.pickedInstallment });
      await verify(
        '결제 금액이 50,000원 이상이면 할부를 고를 수 있다',
        {
          삼개월막힘: await 주문.선택지가막혔는가(주문.할부선택지('3개월')),
          육개월막힘: await 주문.선택지가막혔는가(주문.할부선택지('6개월')),
          고른값: await 주문.할부.evaluate((칸) => (칸 as HTMLSelectElement).selectedOptions[0]?.text ?? ''),
        },
        { 삼개월막힘: false, 육개월막힘: false, 고른값: expected.pickedInstallment },
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
