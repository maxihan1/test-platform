import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 회원정보수정화면 } from './pages/profile.page.js';
import { 회원탈퇴화면 } from './pages/withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-398',
  name: '주문 내역 버튼 반응',
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
  const 주문상세 = new 주문상세화면(page);
  const 수정 = new 회원정보수정화면(page);
  const 탈퇴 = new 회원탈퇴화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('마이페이지 주문 내역 화면을 연다', async () => {
    await 주문내역.열기();
  });

  await test.step('주문 내역 화면이 열렸는지 확인한다', async () => {
    await verify('주문 내역에 주문이 보인다', (await 주문내역.줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('주문 내역에서 「전체」를 누른다', async () => {
    await 주문내역.기간누르기('전체');
    await verify('주문 내역에서 「전체」를 누르면 기간 「전체」가 골라진다', (await 주문내역.골라진기간()).join(', '), '전체');
  });

  await test.step('주문 내역에서 「첫 주문 줄」을 누른다', async () => {
    await 주문내역.열기();
    const 누른줄번호 = await 주문내역.첫줄주문번호();
    await 주문내역.첫줄누르기();
    await 주문상세.제목.waitFor();
    await 주문상세.주문번호값.first().waitFor();
    await verify('주문 내역에서 「첫 주문 줄」을 누르면 그 주문 상세가 보인다', await 주문상세.주문번호글자(), 누른줄번호);
  });

  await test.step('주문 내역에서 「회원정보 수정」을 누른다', async () => {
    await 주문내역.열기();
    await 주문내역.회원정보수정메뉴.click();
    await 수정.제목.waitFor();
    await verify('주문 내역에서 「회원정보 수정」을 누르면 회원정보 수정 화면이 보인다', await 수정.제목.isVisible(), true);
  });

  await test.step('주문 내역에서 「회원 탈퇴」를 누른다', async () => {
    await 주문내역.열기();
    await 주문내역.회원탈퇴메뉴.click();
    await 탈퇴.제목.waitFor();
    await verify('주문 내역에서 「회원 탈퇴」를 누르면 회원 탈퇴 화면이 보인다', await 탈퇴.제목.isVisible(), true);
  });
});
