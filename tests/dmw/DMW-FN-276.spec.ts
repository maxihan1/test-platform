import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디, 석달넘은주문번호 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-276',
  name: '기간 「전체」를 누르면 3개월보다 오래된 주문도 보인다',
  platforms: ['desktop', 'mobile'],
  smoke: true,
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 주문내역화면(page);
  let 오래된주문 = '';

  await test.step('회원으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    오래된주문 = await 석달넘은주문번호(page.request);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('주문 내역 화면을 연다', async () => {
    await 화면.열기();
    await verify('주문 내역 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
    await verify('기간 「3개월」에는 3개월보다 오래된 주문이 보이지 않는다', await 화면.줄(오래된주문).isVisible(), false, { blocker: true });
  });

  await test.step('주문 내역 기간 「전체」를 누른다', async () => {
    await 화면.기간누르기(화면.기간전체, 'all');
    await verify('기간 「전체」를 누르면 3개월보다 오래된 주문도 보인다', await 화면.줄(오래된주문).isVisible(), true);
  });

  await test.step('주문 내역 줄의 주문일 차례를 확인한다', async () => {
    const 날짜들 = await 화면.주문일들.allInnerTexts();
    const 최근순 = [...날짜들].sort().reverse();
    const 두줄이상 = await verify('주문 내역 줄이 두 줄 이상 보인다', 날짜들.length >= 2, true);
    const 순서 = await verify('주문일이 최근인 순으로 늘어서 있다', 날짜들.join(', '), 최근순.join(', '));
    await verify('주문 내역은 주문일이 최근인 순으로 보인다', 두줄이상 && 순서, true);
  });
});
