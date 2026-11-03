import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 환경화면 } from './pages/env.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-146',
  name: '환경 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 환경화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 환경화면.주소);
  });

  await test.step('관리자 로그인을 확인한다', async () => {
    await 화면.그려질때까지();
    await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true, { blocker: true });
  });

  await test.step('「데이터 초기화」를 누른다', async () => {
    await 화면.초기화.click();
    await 화면.확인창.waitFor();
    await verify('환경 화면에서 「데이터 초기화」를 누르면 확인 창이 뜬다', await 화면.확인창.isVisible(), true);
  });

  await test.step('초기화 확인 창의 「닫기」를 누른다', async () => {
    await 화면.확인창닫기.click();
    await 화면.확인창닫힘기다리기();
    await verify('초기화 확인 창에서 「닫기」를 누르면 창이 닫힌다', await 화면.확인창.isVisible(), false);
  });
});
