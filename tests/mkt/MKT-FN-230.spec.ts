import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 한달전날짜 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-230',
  name: '기간 「1개월」을 누르면 주문일이 1개월 안인 주문만 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 내주문 = new 내주문내역화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('회원으로 로그인했는지 확인한다', async () => {
    await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 계정.loginId, true, { blocker: true });
  });

  await test.step('기간 버튼 「1개월」을 누른다', async () => {
    await 내주문.열기();
    await 내주문.기간고르기('1개월');
    const 날짜들 = (await 내주문.줄글들()).map((칸들) => 칸들[0] ?? '');
    await verify('기간 「1개월」을 누르면 주문일이 1개월 안인 주문만 보인다', 날짜들.length > 0 && 날짜들.every((날짜) => 날짜 >= 한달전날짜()), true);
  });

  await test.step('기간 버튼 「전체」를 누른다', async () => {
    await 내주문.기간고르기('3개월');
    const 석달 = await 내주문.줄들.count();
    await 내주문.기간고르기('전체');
    await verify('기간 「전체」를 누르면 「3개월」 때보다 주문이 적지 않게 보인다', (await 내주문.줄들.count()) >= 석달, true);
  });
});
