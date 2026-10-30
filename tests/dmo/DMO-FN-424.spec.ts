import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 환경화면 } from './pages/env.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-424',
  name: '서버를 다시 켜면 「불안정 모드」 스위치가 처음 설정으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  held: '보류 — 서버를 다시 켤 길이 없음',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: z.object({
    처음설정켜짐: z.boolean().describe('서버를 켤 때 「불안정 모드」의 처음 설정 — 켜짐이면 참'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 환경화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '', 환경화면.주소);
  });

  await test.step('관리자 로그인을 확인한다', async () => {
    await 화면.그려질때까지();
    await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true, { blocker: true });
  });

  await test.step('서버를 다시 켠 뒤 환경 화면을 연다', async () => {
    await 화면.열기();
    await verify('서버를 다시 켜면 「불안정 모드」 스위치가 처음 설정으로 돌아간다', await 화면.불안정모드.isChecked(), expected.처음설정켜짐);
  });
});
