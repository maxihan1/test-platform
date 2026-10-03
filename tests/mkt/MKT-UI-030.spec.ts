import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-030',
  name: '장바구니 화면에 상품 줄과 체크박스와 결제 요약이 보인다',
  platforms: ['desktop'],
  precondition: ['새로 가입한 회원이 상품 두 줄을 담아 로그인해 있다'],
  params: z.object({
    firstId: z.number().describe('첫째 상품 번호').default(5),
    firstName: z.string().min(1).describe('첫째 상품 이름').default('오버핏 후드티'),
    firstColor: z.string().describe('첫째 상품 색상').default('아이보리'),
    firstSize: z.string().describe('첫째 상품 사이즈').default('L'),
    secondId: z.number().describe('둘째 상품 번호').default(10),
  }),
  expected: z.object({
    optionText: z.string().describe('옵션 글자').default('아이보리 / L'),
    qty: z.string().describe('수량').default('1'),
    lineAmount: z.string().describe('줄 금액').default('363,900원'),
    summaryLabels: z.string().describe('결제 요약 항목').default('상품 금액, 배송비, 결제 예정 금액'),
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
      await 담는다(page, params.firstId, 1, params.firstColor, params.firstSize);
      await 담는다(page, params.secondId, 1);
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      await 장바구니.줄이나타나기를기다린다();
      await verify('장바구니에 두 줄이 담겨 있다', await 장바구니.줄들.count(), 2, { blocker: true });
      await verify(
        '담은 상품이 이미지 · 상품명 · 옵션 · 수량 · 금액 줄로 보인다',
        {
          이미지: await 장바구니.줄이미지(params.firstName).isVisible(),
          상품명: await 장바구니.줄상품링크(params.firstName).isVisible(),
          옵션: await 장바구니.줄옵션(params.firstName).innerText(),
          수량: await 장바구니.줄수량칸(params.firstName).inputValue(),
          금액: await 장바구니.줄금액(params.firstName).innerText(),
        },
        { 이미지: true, 상품명: true, 옵션: expected.optionText, 수량: expected.qty, 금액: expected.lineAmount },
      );
      await verify(
        '줄마다 체크박스가 있고 처음에는 모두 체크돼 있다',
        { 체크박스: await 장바구니.줄체크들.count(), 체크됨: await 장바구니.체크된줄수() },
        { 체크박스: 2, 체크됨: 2 },
      );
      await verify(
        '오른쪽 결제 요약에 「상품 금액」 · 「배송비」 · 「결제 예정 금액」이 보인다',
        { 항목: (await 장바구니.결제요약항목들.allInnerTexts()).join(', '), 오른쪽: await 장바구니.요약이오른쪽인가() },
        { 항목: expected.summaryLabels, 오른쪽: true },
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
