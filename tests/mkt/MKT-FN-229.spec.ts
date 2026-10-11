import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 주문목록실패모킹 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-229',
  name: '주문 목록 응답이 실패하면 토스트 「잠시 후 다시 시도해 주세요」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 알림 = new 토스트(page);
  const 계정 = 계정값(params);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('회원으로 로그인했는지 확인한다', async () => {
    await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 계정.loginId, true, { blocker: true });
  });

  await test.step('주문 목록 응답을 실패로 바꾸고 주문 내역을 연다', async () => {
    const 해제 = await 주문목록실패모킹(page);
    try {
      await page.goto(내주문내역화면.주소);
      await 알림.알림들.first().waitFor();
      await verify('주문 목록 응답이 실패하면 토스트 「잠시 후 다시 시도해 주세요」가 보인다', await 알림.글('잠시 후 다시 시도해 주세요').isVisible(), true);
    } finally {
      await 해제();
    }
  });
});
