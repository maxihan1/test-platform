import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 테스트계정값 } from './components/account.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-343',
  name: '「회원 탈퇴」 메뉴를 누르면 그 메뉴가 강조되고 「주문 내역」 강조는 풀린다',
  precondition: ['테스트 계정 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('테스트 계정 아이디').optional().meta({ secret: true }),
    password: z.string().describe('테스트 계정 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 계정 = 테스트계정값(params);
  const 주문 = new 주문내역화면(page);
  const 탈퇴 = new 회원탈퇴화면(page);
  const 헤더 = new 머리글(page);

  await test.step('로그인 요청으로 테스트 계정에 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('테스트 계정 회원으로 로그인해 있는지 확인한다', async () => {
    await 안내창끄기(page);
    await 주문.열기();
    await 헤더.로그아웃버튼.waitFor();
    await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
    await verify('주문 내역 화면을 열면 「주문 내역」 메뉴가 강조되어 있다', await 주문.메뉴.링크('주문 내역').getAttribute('aria-current'), 'page', { blocker: true });
  });

  await test.step('마이페이지 왼쪽 「회원 탈퇴」 메뉴를 누른다', async () => {
    await 주문.메뉴.링크('회원 탈퇴').click();
    await 탈퇴.제목.waitFor();
    await verify(
      '「회원 탈퇴」 메뉴를 누르면 그 메뉴가 강조되고 「주문 내역」 강조는 풀린다',
      {
        탈퇴강조: await 주문.메뉴.링크('회원 탈퇴').getAttribute('aria-current'),
        주문내역강조: await 주문.메뉴.링크('주문 내역').getAttribute('aria-current'),
      },
      { 탈퇴강조: 'page', 주문내역강조: null },
    );
  });
});
