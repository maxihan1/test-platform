import type { Page, Route } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 주문서 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-104',
  name: '결제하는 사이 재고가 모자라게 되면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다',
  platforms: ['desktop'],
  precondition: ['주문 요청에 재고 부족 응답이 온다(모킹)', '새로 가입한 회원이 로그인해 있다'],
  params: z.object({
    productId: z.number().describe('주문할 상품 번호').default(2),
    productName: z.string().min(1).describe('상품 이름').default('무선 이어폰 프로'),
    receiver: z.string().min(1).describe('받는 분').default('홍길동'),
    phone: z.string().min(1).describe('연락처').default('01012345678'),
    detail: z.string().min(1).describe('상세 주소').default('101호'),
  }),
  expected: z.object({
    path: z.string().describe('머무는 화면 경로').default('/checkout'),
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
  const 알림 = new 토스트(page);
  await page.context().addInitScript(() => {
    window.localStorage.setItem('dm_cookie_ok', '1');
  });
  const 재고부족응답 = async (route: Route): Promise<void> => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const 본문 = { code: 'CONFLICT', message: `재고가 부족한 상품이 있습니다: ${params.productName}` };
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify(본문) });
  };
  await page.context().route('**/api/orders', 재고부족응답);

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 로그인한다', async () => {
      await 가입하고로그인한다(page, 새아이디());
    });

    await test.step('배송 정보와 결제 수단을 채워 주문서 3단계로 간다', async () => {
      await 주문.바로구매로열기(params.productId, 1);
      await 주문.배송정보를채운다({ 받는분: params.receiver, 연락처: params.phone, 상세주소: params.detail, 배송희망일: 주문.평일배송희망일() });
      await 주문.둘째단계로간다();
      await 주문.결제수단('무통장입금').check();
      await 주문.셋째단계로간다();
      await 주문.약관동의.check();
    });

    await test.step('3단계에서 「{금액}원 결제하기」를 누른다', async () => {
      await 주문.결제하기.click();
      await 알림.전체.first().waitFor();
      await verify(
        '결제하는 사이 재고가 모자라게 되면 「재고가 부족한 상품이 있습니다: {상품명}」이 보인다',
        await 알림.전체.first().innerText(),
        `재고가 부족한 상품이 있습니다: ${params.productName}`,
      );
      await verify(
        '재고가 모자라면 주문 완료 화면으로 가지 않고 주문서에 머문다',
        { 경로: new URL(page.url()).pathname, 결제하기보임: await 주문.결제하기.isVisible() },
        { 경로: expected.path, 결제하기보임: true },
      );
    });
  } finally {
    await page.context().unroute('**/api/orders', 재고부족응답);
    await page.request.delete('/api/me');
  }
});
