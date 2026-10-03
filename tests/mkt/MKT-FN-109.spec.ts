import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-109',
  name: '확인 창에서 확인하면 체크한 줄이 지워진다',
  platforms: ['desktop'],
  held: '보류 — 「확인」을 눌러도 장바구니 줄이 지워지지 않고 삭제 요청도 나가지 않는다',
  precondition: ['새로 가입한 회원이 상품 두 줄을 담아 로그인해 있다'],
  params: z.object({
    firstId: z.number().describe('첫째 상품 번호').default(5),
    firstName: z.string().min(1).describe('첫째 상품 이름').default('오버핏 후드티'),
    firstColor: z.string().describe('첫째 상품 색상').default('아이보리'),
    firstSize: z.string().describe('첫째 상품 사이즈').default('L'),
    secondId: z.number().describe('둘째 상품 번호').default(10),
    secondName: z.string().min(1).describe('둘째 상품 이름').default('스마트 워치'),
  }),
  expected: z.object({
    remaining: z.number().describe('남은 줄 수').default(1),
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
      await 장바구니.열기();
      await 장바구니.줄이나타나기를기다린다();
      await verify('장바구니에 두 줄이 담겨 있다', await 장바구니.줄들.count(), 2, { blocker: true });
    });

    await test.step('확인 창에서 확인한다', async () => {
      await 장바구니.전체선택.setChecked(false);
      await 장바구니.줄체크(params.firstName).check();
      await 장바구니.선택삭제.click();
      await 장바구니.확인창본문.waitFor();
      await 장바구니.확인창확인.click();
      const 지워짐 = await 장바구니.줄이지워졌는가(params.firstName);
      await verify('확인 창에서 확인하면 체크한 줄이 지워진다', { 지워짐, 남은줄: await 장바구니.줄들.count() }, { 지워짐: true, 남은줄: expected.remaining });
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
