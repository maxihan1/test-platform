import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 주문서 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-100',
  name: '연락처에 숫자 9자를 적으면 다음 단계로 넘어가지 않는다',
  platforms: ['desktop'],
  precondition: ['새로 가입한 회원이 상품 한 줄을 담아 로그인해 있다'],
  params: z.object({
    productId: z.number().describe('주문할 상품 번호').default(2),
    receiver: z.string().min(1).describe('받는 분').default('홍길동'),
    detail: z.string().min(1).describe('상세 주소').default('101호'),
    shortPhone: z.string().min(1).describe('숫자 9자 연락처').default('010123456'),
  }),
  expected: z.object({
    firstStep: z.string().describe('첫째 단계 표시').default('① 배송 정보'),
    sundayMessage: z.string().describe('일요일 안내').default('일요일은 배송하지 않습니다'),
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

    await test.step('연락처에 숫자 9자를 적고 다른 칸을 채워 「다음」을 누른다', async () => {
      await 주문.바로구매로열기(params.productId, 1);
      await 주문.배송정보를채운다({ 받는분: params.receiver, 연락처: params.shortPhone, 상세주소: params.detail, 배송희망일: 주문.평일배송희망일() });
      await 주문.첫째다음.click();
      await 주문.다음결과를기다린다();
      await verify('연락처에 숫자 9자를 적으면 다음 단계로 넘어가지 않는다', await 주문.현재단계.innerText(), expected.firstStep);
    });


    await test.step('배송 희망일에 일요일을 고르고 「다음」을 누른다', async () => {
      await 주문.바로구매로열기(params.productId, 1);
      await 주문.배송정보를채운다({ 받는분: params.receiver, 연락처: '01012345678', 상세주소: params.detail, 배송희망일: 주문.일요일배송희망일() });
      await 주문.오류가뜨길기다린다('deliveryDate');
      await 주문.첫째다음.click();
      await 주문.다음결과를기다린다();
      await verify('배송 희망일에 일요일을 고르면 「일요일은 배송하지 않습니다」가 보인다', await 주문.오류문구('deliveryDate').innerText(), expected.sundayMessage);
      await verify('배송 희망일에 일요일을 고르면 다음 단계로 넘어가지 않는다', await 주문.현재단계.innerText(), expected.firstStep);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
