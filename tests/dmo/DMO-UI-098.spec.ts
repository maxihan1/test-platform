import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 관리자로그인 } from './helpers/account.helper.js';
import { 관리자세션인가 } from './helpers/notify-flow.helper.js';
import { 시험데이터화면 } from './pages/fixtures.page.js';

export const spec = defineCase({
  tcId: 'DMO-UI-098',
  name: '시험 데이터 화면에 회원 아이디 칸(기본 「user1」)과 숫자 칸 여섯 개가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 시험데이터화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 관리자로그인(page, params.adminId ?? '', params.adminPassword ?? '');
  });

  await test.step('관리자 로그인을 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 관리자세션인가(page), true, { blocker: true });
  });

  await test.step('/ops/fixtures 를 연다', async () => {
    await 화면.열기();
    const 아이디칸 = await verify('회원 아이디 칸이 보인다', await 화면.회원아이디.isVisible(), true);
    const 기본값 = await verify('회원 아이디 칸의 기본값이 「user1」이다', await 화면.회원아이디.inputValue(), 'user1');
    const 숫자칸 = await verify('숫자 칸이 여섯 개 보인다', await 화면.숫자칸.count(), 6);
    await verify('시험 데이터 화면에 회원 아이디 칸(기본 「user1」)과 숫자 칸 여섯 개가 보인다', 아이디칸 && 기본값 && 숫자칸, true);
  });
});
