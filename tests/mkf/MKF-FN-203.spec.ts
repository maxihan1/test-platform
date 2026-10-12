import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인, 계정값 } from './helpers/account.helper.js';
import { 배송중주문번호, 주문상태 } from './helpers/my-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-203',
  name: '배송중 주문 상세에는 「주문 취소」 버튼이 보이지 않는다',
  techniques: ['상태 전이'],
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
  let 주문번호 = '';

  try {
    await test.step('테스트 계정으로 로그인한다', async () => {
      await 방해막기(page);
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', (await 세션사용자(page.request))?.loginId, 계정.loginId, { blocker: true });
      주문번호 = await 배송중주문번호(page.request);
      await verify('배송중 주문이 있다', await 주문상태(page.request, 주문번호), '배송중', { blocker: true });
    });

    await test.step('배송중 주문의 상세를 연다', async () => {
      await 상세.열기(주문번호);
      await 상세.상태배지.waitFor();
      await verify('배송중 주문 상세에는 「주문 취소」 버튼이 보이지 않는다', await 상세.주문취소.isVisible(), false);
    });
  } finally {
    await API로그아웃(page.request);
  }
});
