import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 주문서 } from './pages/checkout.page.js';
import { 상품상세 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-094',
  name: '「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 보인다',
  platforms: ['desktop'],
  precondition: [
    '새로 가입한 회원이 로그인해 있다',
    '옵션이 있는 상품 상세 화면이다',
    '같은 상품과 옵션이 이미 담겨 있다',
    '같은 상품과 옵션이 9개 담겨 있다',
    '상품 상세 화면이다',
  ],
  params: z.object({
    optionProductId: z.number().describe('옵션이 있는 상품 번호').default(1),
    color: z.string().min(1).describe('색상').default('블랙'),
    size: z.string().min(1).describe('사이즈').default('M'),
    directProductId: z.number().describe('바로 구매할 상품 번호').default(2),
  }),
  expected: z.object({
    badge: z.string().describe('머리글 배지 숫자').default('1'),
    mergedQty: z.number().describe('다시 담은 뒤 수량').default(2),
    maxQty: z.number().describe('최대 수량').default(10),
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

interface 장바구니줄 {
  id: number;
  qty: number;
}

async function 장바구니를읽는다(page: Page): Promise<장바구니줄[]> {
  const 응답 = await page.request.get('/api/cart');
  return ((await 응답.json()) as { items: 장바구니줄[] }).items;
}

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 상품상세(page);
  const 알림 = new 토스트(page);
  const 머리 = new 머리글(page);
  const 주문 = new 주문서(page);
  await page.context().addInitScript(() => {
    window.localStorage.setItem('dm_cookie_ok', '1');
  });
  const 담기응답 = (): Promise<unknown> => page.waitForResponse((응답) => 응답.url().includes('/api/cart') && 응답.request().method() === 'POST');

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 로그인한다', async () => {
      await 가입하고로그인한다(page, 새아이디());
    });

    await test.step('색상과 사이즈를 고르고 「장바구니 담기」를 누른다', async () => {
      await 상세.열기(params.optionProductId);
      await 상세.옵션을고른다(params.color, params.size);
      await 상세.장바구니담기.click();
      await 알림.전체.first().waitFor();
      await verify('「장바구니 담기」를 누르면 토스트 「장바구니에 담았습니다」가 보인다', await 알림.전체.first().innerText(), '장바구니에 담았습니다');
      await 머리.장바구니배지.waitFor();
      await verify('「장바구니 담기」를 누르면 머리글 배지 숫자가 갱신된다', await 머리.장바구니배지.innerText(), expected.badge);
    });

    await test.step('같은 상품과 같은 옵션을 다시 담는다', async () => {
      const 응답 = 담기응답();
      await 상세.장바구니담기.click();
      await 응답;
      const 줄들 = await 장바구니를읽는다(page);
      await verify(
        '같은 상품 · 같은 옵션을 다시 담으면 줄이 늘지 않고 수량이 더해진다',
        { 줄수: 줄들.length, 수량: 줄들[0]?.qty },
        { 줄수: 1, 수량: expected.mergedQty },
      );
    });

    await test.step('같은 상품과 같은 옵션을 3개 더 담는다', async () => {
      const 줄 = (await 장바구니를읽는다(page))[0];
      if (줄 === undefined) throw new Error('담긴 줄이 없다');
      const 맞춤 = await page.request.patch(`/api/cart/${줄.id}`, { data: { qty: 9 } });
      if (!맞춤.ok()) throw new Error(`수량 맞추기 실패 ${맞춤.status()}`);
      await verify('같은 상품과 옵션이 9개 담겨 있다', (await 장바구니를읽는다(page))[0]?.qty, 9, { blocker: true });
      await 상세.수량칸.fill('3');
      const 응답 = 담기응답();
      await 상세.장바구니담기.click();
      await 응답;
      await verify('같은 상품 · 같은 옵션을 더 담아도 수량은 최대 10 이다', (await 장바구니를읽는다(page))[0]?.qty, expected.maxQty);
    });

    await test.step('「바로 구매」를 누른다', async () => {
      await 상세.열기(params.directProductId);
      await 상세.바로구매.click();
      await 주문.제목.waitFor();
      const 주소 = new URL(page.url());
      const 바로구매 = JSON.parse(주소.searchParams.get('direct') ?? '{}') as { productId?: number };
      await verify(
        '「바로 구매」를 누르면 이 상품만 담긴 주문서로 바로 간다',
        { 경로: 주소.pathname, 상품번호: 바로구매.productId, 장바구니줄포함: 주소.searchParams.has('items') },
        { 경로: '/checkout', 상품번호: params.directProductId, 장바구니줄포함: false },
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
