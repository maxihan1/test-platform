import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-237',
  name: '마이페이지 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보이고 「주문 내역」이 강조돼 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문내역 = new 주문내역화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('마이페이지 주문 내역 화면을 연다', async () => {
    await 주문내역.열기();
    const 메뉴가보임 = (await 주문내역.주문내역메뉴.isVisible()) && (await 주문내역.회원정보수정메뉴.isVisible()) && (await 주문내역.회원탈퇴메뉴.isVisible());
    const 강조 = (await 주문내역.강조된메뉴()).join(', ');
    const 앞에있음 = await 주문내역.메뉴가본문앞에있는가();
    await verify(
      '마이페이지 왼쪽에 「주문 내역」 · 「회원정보 수정」 · 「회원 탈퇴」 메뉴가 보이고 「주문 내역」이 강조돼 있다',
      { 메뉴가보임, 강조, 앞에있음 },
      { 메뉴가보임: true, 강조: '주문 내역', 앞에있음: true },
    );
  });
});
