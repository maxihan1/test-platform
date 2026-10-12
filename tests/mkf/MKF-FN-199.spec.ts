import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인, 계정값 } from './helpers/account.helper.js';
import { 석달전날짜 } from './helpers/my-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-199',
  name: '기간 「전체」를 누르면 3개월보다 오래된 주문도 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 내주문 = new 내주문내역화면(page);
  const 계정 = 계정값(params);

  try {
    await test.step('테스트 계정으로 로그인한다', async () => {
      await 방해막기(page);
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', (await 세션사용자(page.request))?.loginId, 계정.loginId, { blocker: true });
    });

    await test.step('주문 내역에서 기간 「전체」를 누른다', async () => {
      await 내주문.열기();
      await 내주문.기간고르기('전체');
      const 날짜들 = (await 내주문.줄글들()).map((칸들) => 칸들[0] ?? '');
      await verify('기간 「전체」를 누르면 3개월보다 오래된 주문도 보인다', 날짜들.some((날짜) => 날짜 !== '' && 날짜 < 석달전날짜()), true);
    });

    await test.step('주문 내역에서 기간 「전체」를 누르고 주문일을 확인한다', async () => {
      await 내주문.기간고르기('전체');
      const 날짜들 = (await 내주문.줄글들()).map((칸들) => 칸들[0] ?? '');
      await verify('주문 내역은 주문일 최신순으로 보인다', 날짜들.length > 1 && 날짜들.join(',') === [...날짜들].sort().reverse().join(','), true);
    });
  } finally {
    await API로그아웃(page.request);
  }
});
