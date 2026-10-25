import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디, 상태별주문번호 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-203',
  name: '주문 상태는 「결제완료」 · 「배송중」 · 「배송완료」 · 「주문취소」 가운데 하나로 보인다',
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
  const 허용 = ['결제완료', '배송중', '배송완료', '주문취소'];
  let 결제완료주문 = '';
  let 배송중주문 = '';

  await test.step('회원으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    결제완료주문 = await 상태별주문번호(page.request, '결제완료');
    배송중주문 = await 상태별주문번호(page.request, '배송중');
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('주문 내역 화면을 연다', async () => {
    await 화면.열기();
    await verify('주문 내역 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('주문 내역 상태 글자를 확인한다', async () => {
    const 글들 = await 화면.상태들.allInnerTexts();
    const 있음 = await verify('상태 글자가 한 줄 이상 보인다', 글들.length > 0, true);
    const 허용밖 = await verify('허용하는 상태가 아닌 글자는 없다', 글들.filter((글) => !허용.includes(글)).join(', '), '');
    await verify('주문 상태는 「결제완료」 · 「배송중」 · 「배송완료」 · 「주문취소」 가운데 하나로 보인다', 있음 && 허용밖, true);
  });

  await test.step('상태가 다른 두 주문의 상태 글자 색을 견준다', async () => {
    const 색 = (주문번호: string): Promise<string> => 화면.줄(주문번호).locator('td:nth-child(5) span').evaluate((칸) => getComputedStyle(칸).color);
    const 결제완료색 = await 색(결제완료주문);
    const 배송중색 = await 색(배송중주문);
    await verify('주문 상태마다 글자 색이 다르게 보인다', 결제완료색 !== 배송중색, true);
  });
});
