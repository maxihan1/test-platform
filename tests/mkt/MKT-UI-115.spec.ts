import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 테스트계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-115',
  name: '마이페이지 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보인다',
  precondition: ['테스트 계정 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 테스트계정값(params);
  const 화면 = new 주문내역화면(page);
  const 헤더 = new 머리글(page);

  await test.step('로그인 요청으로 테스트 계정에 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('테스트 계정 회원으로 로그인해 있는지 확인한다', async () => {
    await 안내창끄기(page);
    await page.goto('/');
    await 헤더.로그아웃버튼.waitFor();
    await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
  });

  await test.step('주문 내역 화면을 연다', async () => {
    await 화면.열기();
    await verify(
      '마이페이지 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보인다',
      [await 화면.메뉴.링크('주문 내역').isVisible(), await 화면.메뉴.링크('회원정보 수정').isVisible(), await 화면.메뉴.링크('회원 탈퇴').isVisible()],
      [true, true, true],
    );
    await verify('주문 내역 화면에서는 「주문 내역」 메뉴가 강조되어 있다', await 화면.메뉴.링크('주문 내역').getAttribute('aria-current'), 'page');
  });
});
