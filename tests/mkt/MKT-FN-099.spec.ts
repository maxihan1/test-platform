import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 주문서 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-099',
  name: '「다음」은 현재 단계 입력이 맞을 때만 넘어간다',
  platforms: ['desktop'],
  precondition: ['새로 가입한 회원이 상품 한 줄을 담아 로그인해 있다'],
  params: z.object({
    productId: z.number().describe('주문할 상품 번호').default(2),
    receiver: z.string().min(1).describe('받는 분').default('홍길동'),
    phone: z.string().min(1).describe('연락처').default('01012345678'),
    detail: z.string().min(1).describe('상세 주소').default('101호'),
    addressQuery: z.string().min(1).describe('주소 검색어').default('강남'),
  }),
  expected: z.object({
    firstStep: z.string().describe('첫째 단계 표시').default('① 배송 정보'),
    popupPath: z.string().describe('주소 검색 새 창 경로').default('/popup/address'),
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

    await test.step('배송 정보를 비운 채 「다음」을 누른다', async () => {
      await 주문.바로구매로열기(params.productId, 1);
      await 주문.첫째다음.click();
      await 주문.오류가뜨길기다린다('receiver');
      await verify(
        '「다음」은 현재 단계 입력이 맞을 때만 넘어간다',
        { 현재단계: await 주문.현재단계.innerText(), 둘째단계: await 주문.결제수단('신용카드').isVisible() },
        { 현재단계: expected.firstStep, 둘째단계: false },
      );
    });

    await test.step('배송 요청 사항에서 「직접 입력」을 고른다', async () => {
      const 전 = await 주문.직접입력칸.isVisible();
      await 주문.배송요청.selectOption({ label: '직접 입력' });
      await 주문.직접입력칸.waitFor();
      await verify('배송 요청 사항에서 「직접 입력」을 고르면 입력칸이 새로 나온다', { 전, 후: await 주문.직접입력칸.isVisible() }, { 전: false, 후: true });
    });

    await test.step('「주소 검색」을 누르고 새 창에서 검색어를 넣어 결과를 고른다', async () => {
      const 팝업 = await 주문.주소검색창을연다();
      await verify('「주소 검색」을 누르면 새 창으로 주소 검색이 열린다', new URL(팝업.url()).pathname, expected.popupPath);
      await 주문.팝업에서검색한다(팝업, params.addressQuery);
      await 주문.팝업결과를고른다(팝업);
      await 주문.주소칸이찰때까지기다린다();
      await verify(
        '결과를 고르면 새 창이 닫히고 주문서의 우편번호 · 주소 칸이 채워진다',
        { 새창닫힘: 팝업.isClosed(), 우편번호채움: (await 주문.우편번호.inputValue()) !== '', 주소채움: (await 주문.주소.inputValue()) !== '' },
        { 새창닫힘: true, 우편번호채움: true, 주소채움: true },
      );
    });

    await test.step('배송 정보를 채워 다음 단계로 갔다가 「이전」을 누른다', async () => {
      const 희망일 = 주문.평일배송희망일();
      await 주문.받는분.fill(params.receiver);
      await 주문.연락처.fill(params.phone);
      await 주문.상세주소.fill(params.detail);
      await 주문.배송희망일.fill(희망일);
      await 주문.둘째단계로간다();
      await 주문.첫째단계로돌아온다();
      await verify(
        '「이전」으로 돌아가면 입력한 값이 남아 있다',
        {
          받는분: await 주문.받는분.inputValue(),
          연락처: await 주문.연락처.inputValue(),
          상세주소: await 주문.상세주소.inputValue(),
          배송희망일: await 주문.배송희망일.inputValue(),
          주소채움: (await 주문.주소.inputValue()) !== '',
        },
        { 받는분: params.receiver, 연락처: params.phone, 상세주소: params.detail, 배송희망일: 희망일, 주소채움: true },
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
