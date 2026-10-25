import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 오늘여덟자리 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-336',
  name: '「주문 내역 내려받기」를 누르면 orders-<오늘 날짜 8자리>.csv 파일이 내려받아진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 관리자화면(page);
  let 파일이름 = '';
  let 첫줄 = '';

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.adminId, params.adminPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  await test.step('관리자 화면의 설정 · 내보내기 탭을 연다', async () => {
    await 화면.열기();
    await 화면.설정탭.click();
    await verify('「주문 내역 내려받기」 링크가 보인다', await 화면.내려받기링크.isVisible(), true, { blocker: true });
  });

  await test.step('「주문 내역 내려받기」를 누른다', async () => {
    const 받음 = await 화면.주문내역내려받기();
    파일이름 = 받음.suggestedFilename();
    첫줄 = ((await 화면.내려받은글(받음)).split(/\r?\n/)[0]) ?? '';
    await verify('「주문 내역 내려받기」를 누르면 orders-<오늘 날짜 8자리>.csv 파일이 내려받아진다', 파일이름, `orders-${오늘여덟자리()}.csv`);
  });

  await test.step('내려받은 파일 첫 줄을 확인한다', async () => {
    await verify('내려받은 주문 내역 파일 첫 줄은 「주문번호,주문일,아이디,결제금액,상태」다', 첫줄, '주문번호,주문일,아이디,결제금액,상태');
  });
});
