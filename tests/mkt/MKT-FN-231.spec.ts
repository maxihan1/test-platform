import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-231',
  name: '주문 내역에서 주문을 누르면 그 주문 상세로 간다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 내주문상세화면(page);
  const 계정 = 계정값(params);
  const 내주문 = new 내주문내역화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('회원으로 로그인했는지 확인한다', async () => {
    await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 계정.loginId, true, { blocker: true });
  });

  await test.step('주문 내역에서 첫 주문을 누른다', async () => {
    await 내주문.열기();
    const 번호 = ((await 내주문.줄글들())[0] ?? [])[1] ?? '';
    await 내주문.줄들.first().click();
    await 상세.그려질때까지();
    await verify('주문 내역에서 주문을 누르면 그 주문 상세로 간다', 번호 !== '' && (await 상세.주문번호표시(번호).isVisible()), true);
  });
});
