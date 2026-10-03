import { defineCase, test, verify } from '@platform/kit';
import type { APIRequestContext } from '@playwright/test';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 로그인폼 } from './components/login-form.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-002',
  name: '장바구니가 비면 배지가 없고 서로 다른 상품 두 줄을 담으면 배지에 「2」가 보인다',
  platforms: ['desktop'],
  precondition: ['새로 가입한 회원으로 로그인해 있다', '장바구니가 비어 있다'],
  params: z.object({}),
  expected: z.object({}),
});

const 예시비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${(Math.random().toString(36) + '000').slice(2, 5)}`;
}

async function 가입한다(request: APIRequestContext, 아이디: string): Promise<number> {
  const 응답 = await request.post('/api/auth/signup', {
    data: {
      loginId: 아이디,
      password: 예시비밀번호,
      passwordConfirm: 예시비밀번호,
      name: '마켓검사',
      email: `${아이디}@demo.market`,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  return 응답.status();
}

async function 장바구니줄수(request: APIRequestContext): Promise<number> {
  const 응답 = await request.get('/api/cart');
  return ((await 응답.json()) as { items: unknown[] }).items.length;
}

test(spec, async ({ page, request }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 로그인 = new 로그인폼(page);
  const 아이디 = 새아이디();

  try {
    await test.step('이번 실행에서 쓸 회원을 만든다', async () => {
      await 가입한다(request, 아이디);
      await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
    });

    await test.step('로그인 화면에서 로그인한다', async () => {
      await 홈.쿠키띠를치운다();
      await 홈.공지팝업을치운다();
      await 홈.설문을치운다();
      await 로그인.로그인한다(아이디, 예시비밀번호);
    });

    await test.step('로그인 상태와 빈 장바구니를 확인한다', async () => {
      await verify('머리글에 「로그아웃」이 보인다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('장바구니가 비어 있다', await 장바구니줄수(request), 0, { blocker: true });
    });

    await test.step('머리글의 장바구니 아이콘 옆을 확인한다', async () => {
      await 홈.열고장바구니응답을기다린다();
      await 머리.장바구니.waitFor();
      await verify('장바구니가 비어 있으면 장바구니 아이콘 옆에 숫자 배지가 보이지 않는다', await 머리.장바구니배지.isVisible(), false);
    });

    await test.step('서로 다른 상품 두 줄을 장바구니에 담고 홈 화면을 연다', async () => {
      const 목록 = (await (await request.get('/api/products?size=8')).json()) as { items: { id: number; soldOut: boolean }[] };
      const 담을것 = 목록.items.filter((상품) => !상품.soldOut).slice(0, 2);
      for (const 상품 of 담을것) {
        const 상세 = (await (await request.get(`/api/products/${상품.id}`)).json()) as { colors: string[]; sizes: string[] };
        await request.post('/api/cart', {
          data: { productId: 상품.id, color: 상세.colors[0] ?? '', size: 상세.sizes[0] ?? '', qty: 1 },
        });
      }
      await verify('장바구니에 두 줄이 담겨 있다', await 장바구니줄수(request), 2, { blocker: true });
      await 홈.열고장바구니응답을기다린다();
      await 머리.장바구니배지.waitFor();
      await verify('장바구니에 서로 다른 상품 두 줄을 담으면 장바구니 아이콘 옆 배지에 「2」가 보인다', await 머리.장바구니배지.innerText(), '2');
    });
  } finally {
    await request.delete('/api/me');
  }
});
