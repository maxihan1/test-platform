import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-018',
  name: '마이페이지 왼쪽에 메뉴 세 개가 보이고 현재 메뉴 「주문 내역」이 강조돼 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user2'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 머리 = new 머리글(page);
  const 화면 = new 주문내역화면(page);
  await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });

  await test.step('마이페이지의 주문 내역 화면을 연다', async () => {
    await 화면.열기();
    await 화면.제목().waitFor();
    await 머리.로그아웃버튼().waitFor();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃버튼().isVisible(), true, { blocker: true });
    await verify(
      '마이페이지 왼쪽에 「주문 내역」 「회원정보 수정」 「회원 탈퇴」 메뉴가 보인다',
      [await 화면.메뉴링크('주문 내역').isVisible(), await 화면.메뉴링크('회원정보 수정').isVisible(), await 화면.메뉴링크('회원 탈퇴').isVisible()],
      [true, true, true],
    );
    await verify('현재 메뉴 「주문 내역」이 강조돼 보인다', await 화면.현재메뉴().innerText(), '주문 내역');
  });
});
