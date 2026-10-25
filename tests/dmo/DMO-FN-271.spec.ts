import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 알림쿠폰화면 } from './pages/notify.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-271',
  name: '할인 금액 5,000원 · 최소 주문 금액 0원을 적으면 미리 보기에 「5,000원 할인 (운영 지급)」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    할인금액: z.number().int().describe('적을 할인 금액 — 1,000~50,000원 · 1,000원 단위').default(5000),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 알림쿠폰화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 알림쿠폰화면.주소);
  });

  await test.step('관리자 로그인을 확인한다', async () => {
    await 화면.그려질때까지();
    await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true, { blocker: true });
  });

  await test.step('할인 금액 5000 · 최소 주문 금액 0 을 적는다', async () => {
    await 화면.할인금액.fill(String(params.할인금액));
    await 화면.최소주문금액.fill('0');
    await verify(
      '할인 금액 5,000원 · 최소 주문 금액 0원을 적으면 미리 보기에 「5,000원 할인 (운영 지급)」이 보인다',
      await 화면.미리보기.innerText(),
      `${params.할인금액.toLocaleString('ko-KR')}원 할인 (운영 지급)`,
    );
  });
});
