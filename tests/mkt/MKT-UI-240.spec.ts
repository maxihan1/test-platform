import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-240',
  name: '주문 내역 줄에 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보이고 상품이 여럿인 주문은 「외 N건」이 붙는다',
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
    await verify('주문 내역에 주문이 보인다', (await 주문내역.줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('주문 내역 표의 머리와 줄을 확인한다', async () => {
    const 머리 = (await 주문내역.열머리글자()).join(', ');
    const 줄들 = await 주문내역.줄칸글자();
    const 칸이맞음 = 줄들.every(
      (칸) =>
        칸.length === 5 &&
        /^\d{4}-\d{2}-\d{2}$/.test(칸[0] ?? '') &&
        /^DM\d{8}-\d{4}$/.test(칸[1] ?? '') &&
        (칸[2] ?? '').length > 0 &&
        /^[\d,]+원$/.test(칸[3] ?? '') &&
        /^(결제완료|배송중|배송완료|주문취소)$/.test(칸[4] ?? ''),
    );
    const 외N건있음 = 줄들.some((칸) => /외 \d+건$/.test(칸[2] ?? ''));
    await verify(
      '주문 내역 줄에 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보이고 상품이 여럿인 주문은 「외 N건」이 붙는다',
      { 머리, 칸이맞음, 외N건있음 },
      { 머리: '주문일, 주문번호, 상품명, 결제 금액, 상태', 칸이맞음: true, 외N건있음: true },
    );
  });
});
