import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-031',
  name: '장바구니가 비어 있으면 「장바구니가 비어 있습니다」와 「쇼핑하러 가기」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['장바구니가 비어 있는 새 회원이 로그인해 있다'],
  params: null,
  expected: null,
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

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  await page.context().addInitScript(() => {
    window.localStorage.setItem('dm_cookie_ok', '1');
  });

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 로그인한다', async () => {
      await 가입하고로그인한다(page, 새아이디());
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      await 장바구니.비어있음을기다린다();
      await verify('장바구니가 비어 있으면 「장바구니가 비어 있습니다」가 보인다', await 장바구니.비어있음문구.innerText(), '장바구니가 비어 있습니다');
      await verify('장바구니가 비어 있으면 「쇼핑하러 가기」 버튼이 보인다', await 장바구니.쇼핑하러가기.innerText(), '쇼핑하러 가기');
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
