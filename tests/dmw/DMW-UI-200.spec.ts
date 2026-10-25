import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-200',
  name: '마이페이지 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보이고 「주문 내역」이 강조된다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 주문내역화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.loginId, params.loginPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('마이페이지 주문 내역을 연다', async () => {
    await 화면.열기();
    const 주문내역 = await verify('왼쪽 메뉴에 「주문 내역」이 보인다', await 화면.메뉴주문내역.isVisible(), true);
    const 회원정보수정 = await verify('왼쪽 메뉴에 「회원정보 수정」이 보인다', await 화면.메뉴회원정보수정.isVisible(), true);
    const 회원탈퇴 = await verify('왼쪽 메뉴에 「회원 탈퇴」가 보인다', await 화면.메뉴회원탈퇴.isVisible(), true);
    const 강조 = await verify('강조된 메뉴는 「주문 내역」이다', (await 화면.강조된메뉴.allInnerTexts()).join(', '), '주문 내역');
    await verify('마이페이지 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보이고 「주문 내역」이 강조된다', 주문내역 && 회원정보수정 && 회원탈퇴 && 강조, true);
  });
});
