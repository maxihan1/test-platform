import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-242',
  name: '주문 줄을 누르면 그 주문 상세로 간다',
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
  let 누른줄번호 = '';

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('마이페이지 주문 내역 화면을 연다', async () => {
    await 주문내역.열기();
    await verify('주문 내역에 주문이 보인다', (await 주문내역.줄들.count()) > 0, true, { blocker: true });
    누른줄번호 = await 주문내역.첫줄주문번호();
  });

  await test.step('주문 내역의 첫 주문 줄을 누른다', async () => {
    await 주문내역.첫줄누르기();
    await 주문상세.제목.waitFor();
    await 주문상세.주문번호값.first().waitFor();
    await verify('주문 줄을 누르면 그 주문 상세로 간다', await 주문상세.주문번호글자(), 누른줄번호);
  });
});
