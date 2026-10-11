import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-269',
  name: '주문 내역 줄마다 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다',
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

  await test.step('마이페이지 주문 내역을 연다', async () => {
    await 내주문.열기();
    const 줄들 = await 내주문.줄글들();
    await verify('주문 내역 줄마다 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 보인다', 줄들.length > 0 && 줄들.every((칸들) => 칸들.length === 5 && 칸들.every((칸) => 칸 !== '')), true);
    const 여럿 = 줄들.find((칸들) => /외 \d+건$/.test(칸들[2] ?? ''));
    const 건수 = Number(/외 (\d+)건$/.exec(여럿?.[2] ?? '')?.[1] ?? 0);
    const 상품줄수 = 여럿 === undefined ? 0 : ((await (await page.request.get('/api/orders/' + encodeURIComponent(여럿[1] ?? ''))).json()) as { lines: unknown[] }).lines.length;
    await verify('상품이 여럿인 주문은 대표 상품명 뒤에 「외 {N}건」이 붙어 보인다', 여럿 !== undefined && 건수 === 상품줄수 - 1, true);
  });
});
