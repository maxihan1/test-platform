import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 날짜글자 } from './helpers/data.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-315',
  name: '주문 내역 기간 버튼은 「3개월」이 처음 골라져 있고 3개월 안 주문만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

function 개월전(개월: number): string {
  const 날 = new Date();
  날.setMonth(날.getMonth() - 개월);
  return 날짜글자(날);
}

test(spec, async ({ page, params }) => {
  const 주문내역 = new 주문내역화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('주문 내역 화면을 연다', async () => {
    await 주문내역.열기();
    const 날짜들 = await 주문내역.주문일들();
    await verify(
      '주문 내역 기간 버튼은 「3개월」이 처음 골라져 있고 3개월 안 주문만 보인다',
      { 골라진기간: (await 주문내역.골라진기간()).join(', '), 석달안만: 날짜들.every((날짜) => 날짜 >= 개월전(3)) },
      { 골라진기간: '3개월', 석달안만: true },
    );
  });

  await test.step('기간 「1개월」을 누른다', async () => {
    await 주문내역.기간누르기('1개월');
    const 날짜들 = await 주문내역.주문일들();
    await verify('기간 「1개월」을 누르면 1개월 안 주문만 보인다', 날짜들.every((날짜) => 날짜 >= 개월전(1)), true);
  });

  await test.step('기간 「전체」를 눌러 3개월보다 오래된 주문을 찾는다', async () => {
    await 주문내역.기간누르기('전체');
    const 날짜들 = await 주문내역.주문일들();
    await verify('기간 「전체」를 누르면 3개월보다 오래된 주문도 보인다', 날짜들.some((날짜) => 날짜 < 개월전(3)), true);
  });
});
