import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인, 회원가입 } from './helpers/account.helper.js';
import { 주문하나 } from './helpers/orders-flow.helper.js';
import { 주문관리화면 } from './pages/orders.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-420',
  name: '주문 상태 바꾸기 응답이 서버 실패면 화면이 깨지지 않고 오류 안내 토스트가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: [
    '관리자 계정으로 로그인해 있고 일회용 회원에게 결제완료 주문이 있다',
    '주문 상태 바꾸기 응답은 가짜 응답(모킹)이다',
  ],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 화면 = new 주문관리화면(page);
  const 회원 = { loginId: '' };
  let 주문 = '';

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
  });

  await test.step('관리자 계정으로 로그인해 있는지 확인한다', async () => {
    await 화면.틀.머리줄.waitFor();
    await verify('관리자 계정으로 로그인해 있다', await 화면.틀.로그아웃.isVisible(), true, { blocker: true });
  });

  await test.step('일회용 회원에게 결제완료 주문을 만든다', async () => {
    회원.loginId = (await 회원가입(request)).loginId;
    주문 = await 주문하나(page, 회원.loginId, '결제완료');
  });

  await test.step('만든 결제완료 주문이 주문 관리 화면에 보이는지 확인한다', async () => {
    await 화면.열기();
    await 화면.주문줄(주문).waitFor();
    await verify('일회용 회원에게 결제완료 주문이 있다', await 화면.상태글자(주문), '결제완료', { blocker: true });
  });

  await test.step('상태 바꾸기 응답이 실패하는 채로 「배송중」을 고른다', async () => {
    const 주소 = '**/api/ops/orders/*/status';
    await page.context().route(주소, async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });
    try {
      const 토스트글 = await 화면.상태바꾸기(주문, '배송중');
      const 안내 = await verify('오류 안내 토스트가 보인다', 토스트글.trim() !== '', true);
      await 화면.주문줄(주문).waitFor();
      const 멀쩡 = await verify('화면이 깨지지 않는다', await 화면.주문줄(주문).isVisible(), true);
      await verify('주문 상태 바꾸기 응답이 서버 실패면 화면이 깨지지 않고 오류 안내 토스트가 보인다', 안내 && 멀쩡, true);
    } finally {
      await page.context().unroute(주소);
    }
  });
});
