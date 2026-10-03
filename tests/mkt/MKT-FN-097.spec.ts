import type { Page } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-097',
  name: '「전체 선택」 체크박스로 모두 체크하거나 해제할 수 있다',
  platforms: ['desktop'],
  precondition: ['새로 가입한 회원이 상품 두 줄을 담아 로그인해 있다', '새로 가입한 회원이 상품 한 줄을 담아 로그인해 있다'],
  params: z.object({
    firstId: z.number().describe('첫째 상품 번호').default(5),
    firstName: z.string().min(1).describe('첫째 상품 이름').default('오버핏 후드티'),
    firstColor: z.string().describe('첫째 상품 색상').default('아이보리'),
    firstSize: z.string().describe('첫째 상품 사이즈').default('L'),
    secondId: z.number().describe('둘째 상품 번호').default(10),
    secondName: z.string().min(1).describe('둘째 상품 이름').default('스마트 워치'),
  }),
  expected: z.object({
    secondLineAmount: z.string().describe('둘째 줄 수량 2 금액').default('271,800원'),
    goodsAmount: z.string().describe('상품 금액 합계').default('635,700원'),
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
  const 알림 = new 토스트(page);
  await page.context().addInitScript(() => {
    window.localStorage.setItem('dm_cookie_ok', '1');
  });

  try {
    await test.step('이번 실행에서 쓸 새 회원을 가입시키고 상품 두 줄을 담는다', async () => {
      await 가입하고로그인한다(page, 새아이디());
      await 담는다(page, params.firstId, 1, params.firstColor, params.firstSize);
      await 담는다(page, params.secondId, 1);
    });

    await test.step('장바구니에서 「전체 선택」 체크박스를 해제한다', async () => {
      await 장바구니.열기();
      await 장바구니.줄이나타나기를기다린다();
      await verify('장바구니에 두 줄이 담겨 있고 모두 체크돼 있다', { 줄: await 장바구니.줄들.count(), 체크됨: await 장바구니.체크된줄수() }, { 줄: 2, 체크됨: 2 }, { blocker: true });
      await 장바구니.전체선택.uncheck();
      const 해제뒤 = await 장바구니.체크된줄수();
      await 장바구니.전체선택.check();
      const 체크뒤 = await 장바구니.체크된줄수();
      await verify('「전체 선택」 체크박스로 모두 체크하거나 해제할 수 있다', { 해제뒤, 체크뒤 }, { 해제뒤: 0, 체크뒤: 2 });
    });

    await test.step('장바구니에서 줄 하나의 체크박스를 해제한다', async () => {
      await 장바구니.줄체크(params.firstName).uncheck();
      await verify('줄 하나라도 해제하면 「전체 선택」도 해제된다', await 장바구니.전체선택.isChecked(), false);
    });

    await test.step('장바구니에서 줄의 수량을 바꾼다', async () => {
      await 장바구니.줄체크(params.firstName).check();
      await 장바구니.줄수량늘리기(params.secondName).click();
      await 장바구니.줄금액을기다린다(params.secondName, expected.secondLineAmount);
      await verify(
        '줄마다 수량을 바꾸면 줄 금액과 합계가 바로 바뀐다',
        { 줄금액: await 장바구니.줄금액(params.secondName).innerText(), 합계: await 장바구니.상품금액.innerText() },
        { 줄금액: expected.secondLineAmount, 합계: expected.goodsAmount },
      );
    });

    await test.step('모든 체크를 해제하고 「선택 삭제」를 누른다', async () => {
      await 장바구니.전체선택.uncheck();
      await 장바구니.선택삭제.click();
      await 알림.전체.first().waitFor();
      await verify('아무것도 체크하지 않고 「선택 삭제」를 누르면 토스트 「삭제할 상품을 선택하세요」가 보인다', await 알림.전체.first().innerText(), '삭제할 상품을 선택하세요');
    });

    await test.step('장바구니에서 모든 체크를 해제한다', async () => {
      await 장바구니.전체선택.setChecked(false);
      await verify('체크한 상품이 없으면 「주문하기」 버튼이 눌리지 않는다', await 장바구니.주문하기.isDisabled(), true);
    });

    await test.step('줄 하나를 체크하고 「선택 삭제」를 누른다', async () => {
      await 장바구니.줄체크(params.firstName).check();
      await 장바구니.선택삭제.click();
      await 장바구니.확인창본문.waitFor();
      await verify('「선택 삭제」를 누르면 확인 창 「선택한 상품 {N}개를 삭제하시겠습니까?」가 뜬다', await 장바구니.확인창본문.innerText(), '선택한 상품 1개를 삭제하시겠습니까?');
    });

  } finally {
    await page.request.delete('/api/me');
  }
});
