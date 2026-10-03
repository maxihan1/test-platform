import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 주문서 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-032',
  name: '주문서 화면에 단계 표시와 배송 정보와 결제 수단과 최종 확인이 보인다',
  platforms: ['desktop'],
  precondition: [
    '새로 가입한 회원이 상품 한 줄을 담아 로그인해 있다',
    '새로 가입한 회원이 상품 한 줄을 담고 배송 정보까지 채웠다',
    '새로 가입한 회원이 상품 한 줄을 담고 1·2단계를 채워 3단계에 왔다',
  ],
  params: z.object({
    productId: z.number().describe('주문할 상품 번호').default(2),
    receiver: z.string().min(1).describe('받는 분').default('홍길동'),
    phone: z.string().min(1).describe('연락처').default('01012345678'),
    detail: z.string().min(1).describe('상세 주소').default('101호'),
  }),
  expected: z.object({
    steps: z.string().describe('단계 표시').default('① 배송 정보, ② 결제 수단, ③ 최종 확인'),
    current: z.string().describe('현재 단계').default('① 배송 정보'),
    fields: z.string().describe('배송 정보 칸').default('받는 분, 연락처, 주소, 상세 주소, 배송 요청 사항'),
    methods: z.string().describe('결제 수단').default('신용카드, 계좌이체, 무통장입금'),
    coupons: z.string().describe('쿠폰 선택지').default('10% 할인 (최대 5,000원), 3,000원 할인 (30,000원 이상 구매 시)'),
    blocks: z.string().describe('최종 확인 묶음').default('상품 목록, 배송 정보, 결제 수단, 결제 금액'),
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

    await test.step('주문서 화면을 연다', async () => {
      await 주문.바로구매로열기(params.productId, 1);
      await verify('주문서 위쪽 단계 표시에 「① 배송 정보」 · 「② 결제 수단」 · 「③ 최종 확인」이 보인다', (await 주문.단계항목들.allInnerTexts()).join(', '), expected.steps);
      await verify('위쪽 단계 표시에서 현재 단계가 강조된다', await 주문.현재단계.innerText(), expected.current);
      const 보이는칸: string[] = [];
      if (await 주문.받는분.isVisible()) 보이는칸.push('받는 분');
      if (await 주문.연락처.isVisible()) 보이는칸.push('연락처');
      if (await 주문.주소.isVisible()) 보이는칸.push('주소');
      if (await 주문.상세주소.isVisible()) 보이는칸.push('상세 주소');
      if (await 주문.배송요청.isVisible()) 보이는칸.push('배송 요청 사항');
      await verify('배송 정보에 받는 분 · 연락처 · 주소 · 상세 주소 · 배송 요청 사항 칸이 보인다', 보이는칸.join(', '), expected.fields);
      await verify('주소 칸은 직접 입력할 수 없다', await 주문.주소.isEditable(), false);
      await verify('배송 희망일은 오늘로부터 2일 뒤부터 14일 뒤까지만 고를 수 있는 날짜 선택기다', await 주문.배송희망일범위(), 주문.기대범위());
    });

    await test.step('주문서 2단계로 간다', async () => {
      await 주문.배송정보를채운다({ 받는분: params.receiver, 연락처: params.phone, 상세주소: params.detail, 배송희망일: 주문.평일배송희망일() });
      await 주문.둘째단계로간다();
      await verify('결제 수단은 「신용카드」 · 「계좌이체」 · 「무통장입금」 라디오로 보인다', (await 주문.결제수단이름들()).join(', '), expected.methods);
      const 선택지들 = (await 주문.쿠폰선택지들.allInnerTexts()).filter((글자) => 글자 !== '쿠폰 선택 안 함');
      await verify('쿠폰 드롭다운에 「10% 할인 (최대 5,000원)」 · 「3,000원 할인 (30,000원 이상 구매 시)」 두 가지가 보인다', 선택지들.join(', '), expected.coupons);
    });

    await test.step('주문서 3단계로 간다', async () => {
      await 주문.결제수단('신용카드').check();
      await 주문.셋째단계로간다();
      await verify('최종 확인 단계에 상품 목록 · 배송 정보 · 결제 수단 · 금액이 보인다', (await 주문.최종확인제목들.allInnerTexts()).join(', '), expected.blocks);
      await verify('「주문 내용을 확인했으며 결제에 동의합니다」를 체크하기 전에는 「{금액}원 결제하기」 버튼이 눌리지 않는다', await 주문.결제하기.isDisabled(), true);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
