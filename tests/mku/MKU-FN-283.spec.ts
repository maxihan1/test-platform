import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 날짜글 } from './helpers/shop.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-283',
  name: '「주문 내역 내려받기」를 누르면 orders-{오늘 날짜 8자리}.csv 파일이 내려받아진다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = 관리자값(params);
  const 화면 = new 관리자화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 관리자.loginId, 관리자.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
  });

  await test.step('관리자 화면을 준비한다', async () => {
    await 화면.열기();
    await 화면.주문내려받기.waitFor();
  });

  await test.step('관리자 화면이 열렸는지 확인한다', async () => {
    await verify('「주문 내역 내려받기」 버튼이 보인다', await 화면.주문내려받기.isVisible(), true, { blocker: true });
  });

  await test.step('「주문 내역 내려받기」를 누른다', async () => {
    const [내려받음] = await Promise.all([page.waitForEvent('download'), 화면.주문내려받기.click()]);
    await verify('「주문 내역 내려받기」를 누르면 orders-{오늘 날짜 8자리}.csv 파일이 내려받아진다', 내려받음.suggestedFilename(), `orders-${날짜글(new Date()).replace(/-/g, '')}.csv`);
  });
});
