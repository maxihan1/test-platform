import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 알림쿠폰화면 } from './pages/notify.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-241',
  name: '알림 내용칸에 다섯 글자를 적으면 「5 / 100」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
    글자수: z.number().int().describe('내용칸에 적을 글자 수 — 1~100').default(5),
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

  await test.step('내용칸에 다섯 글자를 적는다', async () => {
    await 화면.알림내용.fill('가'.repeat(params.글자수));
    await verify('알림 내용칸에 다섯 글자를 적으면 「5 / 100」이 보인다', await 화면.글자수.innerText(), `${params.글자수} / 100`);
  });
});
