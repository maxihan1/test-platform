import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-201',
  name: '주문 내역 기간 버튼 「1개월」 · 「3개월」 · 「전체」가 보이고 「3개월」이 골라져 있다',
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

  await test.step('주문 내역 화면을 연다', async () => {
    await 화면.열기();
    await verify('주문 내역 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('주문 내역 기간 버튼을 확인한다', async () => {
    const 한달 = await verify('기간 버튼 「1개월」이 보인다', await 화면.기간1개월.isVisible(), true);
    const 석달 = await verify('기간 버튼 「3개월」이 보인다', await 화면.기간3개월.isVisible(), true);
    const 전체 = await verify('기간 버튼 「전체」가 보인다', await 화면.기간전체.isVisible(), true);
    const 골라짐 = await verify('골라져 있는 기간 버튼은 「3개월」이다', (await 화면.눌린기간.allInnerTexts()).join(', '), '3개월');
    await verify('주문 내역 기간 버튼 「1개월」 · 「3개월」 · 「전체」가 보이고 「3개월」이 골라져 있다', 한달 && 석달 && 전체 && 골라짐, true);
  });
});
