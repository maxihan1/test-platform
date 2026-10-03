import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-013',
  name: '마이페이지 주문 내역 화면에 메뉴 · 기간 버튼 · 주문 줄이 기획서대로 보인다',
  precondition: ['회원 계정으로 로그인해 있다', '주문이 있는 회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    menus: z.string().describe('왼쪽 메뉴 이름들').default('주문 내역, 회원정보 수정, 회원 탈퇴'),
    current: z.string().describe('현재 메뉴의 aria-current 값').default('page'),
    pressed: z.string().describe('선택된 기간 버튼의 aria-pressed 값').default('true'),
    shown: z.boolean().describe('보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 내역 = new 주문내역화면(page);

  await test.step('회원 계정으로 로그인한다', async () => {
    await new 로그인폼(page).로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('마이페이지 주문 내역 화면을 연다', async () => {
    await 내역.열기();
    await 내역.메뉴('주문 내역').waitFor();
    await verify('마이페이지 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보인다', (await 내역.메뉴링크들.allInnerTexts()).join(', '), expected.menus);
    await verify('마이페이지에서 현재 메뉴 「주문 내역」이 강조돼 보인다', await 내역.메뉴('주문 내역').getAttribute('aria-current'), expected.current);

    const 기간들 = ['1개월', '3개월', '전체'].map((이름) => 내역.기간버튼(이름));
    await verify('주문 내역 위쪽에 기간 버튼 「1개월」 · 「3개월」 · 「전체」가 보인다', (await Promise.all(기간들.map((버튼) => 버튼.isVisible()))).every(Boolean), expected.shown);
    await verify('기간 버튼 「3개월」이 기본으로 선택돼 있다', await 내역.기간버튼('3개월').getAttribute('aria-pressed'), expected.pressed);

    const 줄들 = await 내역.줄정보();
    const 채움 = await 내역.칸채움();
    await verify('주문 내역 각 줄에 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다', 줄들.length > 0 && 줄들.every((줄) => 줄.칸수 === 5) && 채움.every(Boolean), expected.shown);
  });

  await test.step('마이페이지 주문 내역 화면에서 기간 「전체」를 연다', async () => {
    await 내역.기간을누른다('전체');
    const 색들 = await 내역.상태색들();
    const 상태수 = new Set(색들.map((항목) => 항목.상태)).size;
    const 색수 = new Set(색들.map((항목) => 항목.색)).size;
    await verify('주문 상태마다 글자 색이 다르다', 상태수 > 1 && 상태수 === 색수, expected.shown);
  });
});
