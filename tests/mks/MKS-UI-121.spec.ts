import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, 로그인한아이디, 테스트계정으로로그인 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-121',
  name: '주문 내역 조회 기간에 「3개월」이 골라진 채로 보인다',
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문내역 = new 내주문내역화면(page);

  await test.step('테스트 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await 테스트계정으로로그인(page.request, params);
  });

  await test.step('테스트 계정으로 로그인했는지 확인한다', async () => {
    await verify('테스트 계정으로 로그인해 있다', await 로그인한아이디(page.request), 계정값(params).loginId, { blocker: true });
  });

  await test.step('주문 내역을 연다', async () => {
    await 주문내역.열기();
    await 주문내역.표.or(주문내역.빈안내).waitFor();
    await verify('주문 내역 화면이 열려 있다', 경로(page), 내주문내역화면.주소, { blocker: true });
    await verify('주문 내역 조회 기간에 「3개월」이 골라진 채로 보인다', await 주문내역.골라진기간버튼('3개월').isVisible(), true);
  });
});
