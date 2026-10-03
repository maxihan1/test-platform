import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 상품상세 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-093',
  name: '옵션을 고르지 않고 담으면 토스트 「옵션을 선택하세요」가 보인다',
  platforms: ['desktop'],
  precondition: [
    '옵션이 있는 상품 상세 화면이다',
    '재고가 10개 이상인 상품 상세 화면이다',
    '상품 상세 화면이다',
    '상품 문의가 있는 상품 상세 화면이다',
    '질문 하나가 펼쳐져 있다',
    '상품 문의가 둘 이상 있다',
    '새로 가입한 회원이 로그인해 있다',
  ],
  params: z.object({
    productId: z.number().describe('옵션이 있는 상품 번호').default(1),
    firstQuestion: z.string().min(1).describe('첫째 질문').default('배송은 얼마나 걸리나요?'),
    secondQuestion: z.string().min(1).describe('둘째 질문').default('교환이 가능한가요?'),
  }),
  expected: z.object({
    maxQty: z.number().describe('수량 최대값').default(10),
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

function 금액(글자: string): number {
  return Number(글자.replace(/\D/g, ''));
}

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 상품상세(page);
  const 알림 = new 토스트(page);
  await page.context().addInitScript(() => {
    window.localStorage.setItem('dm_cookie_ok', '1');
  });

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 로그인한다', async () => {
      await 가입하고로그인한다(page, 새아이디());
    });

    await test.step('옵션을 고르지 않고 「장바구니 담기」를 누른다', async () => {
      await 상세.열기(params.productId);
      await 상세.장바구니담기.click();
      await 알림.전체.first().waitFor();
      await verify('옵션을 고르지 않고 담으면 토스트 「옵션을 선택하세요」가 보인다', await 알림.전체.first().innerText(), '옵션을 선택하세요');
    });

    await test.step('수량 「+」를 한 번 누른다', async () => {
      const 한개금액 = 금액(await 상세.총상품금액.innerText());
      await 상세.수량늘리기.click();
      await verify(
        '수량을 바꾸면 「총 상품 금액」이 바로 바뀐다',
        { 수량: await 상세.수량칸.inputValue(), 금액두배: 금액(await 상세.총상품금액.innerText()) === 한개금액 * 2 },
        { 수량: '2', 금액두배: true },
      );
    });

    await test.step('수량 「+」를 계속 누른다', async () => {
      await 상세.수량을끝까지올린다();
      await verify(
        '수량이 최대(재고와 10 중 작은 값)에 닿으면 「+」 버튼이 눌리지 않는다',
        { 수량: await 상세.수량칸.inputValue(), 늘리기막힘: await 상세.수량늘리기.isDisabled() },
        { 수량: String(expected.maxQty), 늘리기막힘: true },
      );
    });

    await test.step('「리뷰」 탭과 「상품 문의」 탭을 차례로 누른다', async () => {
      const 전 = page.url();
      await 상세.리뷰탭.click();
      await 상세.리뷰불러오는중.or(상세.리뷰실패문구).or(상세.리뷰한건들.first()).first().waitFor();
      await 상세.문의탭.click();
      await 상세.문의패널.waitFor();
      await verify('탭을 누르면 내용만 바뀌고 주소는 바뀌지 않는다', page.url() === 전, true);
    });

    await test.step('「상품 문의」 탭에서 질문을 누른다', async () => {
      await 상세.질문(params.firstQuestion).click();
      await 상세.열린답변들.first().waitFor();
      await verify(
        '「상품 문의」 탭의 질문을 누르면 그 아래에 답변이 펼쳐진다',
        { 펼침: await 상세.질문이펼쳐졌는가(params.firstQuestion), 보이는답변: await 상세.열린답변들.count() },
        { 펼침: true, 보이는답변: 1 },
      );
    });

    await test.step('펼친 질문을 다시 누른다', async () => {
      await 상세.질문(params.firstQuestion).click();
      await 상세.열린답변들.first().waitFor({ state: 'detached' });
      await verify(
        '펼친 질문을 다시 누르면 답변이 접힌다',
        { 펼침: await 상세.질문이펼쳐졌는가(params.firstQuestion), 보이는답변: await 상세.열린답변들.count() },
        { 펼침: false, 보이는답변: 0 },
      );
    });

    await test.step('질문 둘을 차례로 누른다', async () => {
      await 상세.질문(params.firstQuestion).click();
      await 상세.질문(params.secondQuestion).click();
      await 상세.열린답변들.nth(1).waitFor();
      await verify(
        '질문 여러 개를 동시에 펼칠 수 있다',
        { 펼친질문: await 상세.모두펼친질문수(), 보이는답변: await 상세.열린답변들.count() },
        { 펼친질문: 2, 보이는답변: 2 },
      );
    });
  } finally {
    await page.request.delete('/api/me');
  }
});
