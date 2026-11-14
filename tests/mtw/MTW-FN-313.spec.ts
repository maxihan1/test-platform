import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { type 새계정, 확인된새계정만들기 } from './helpers/signup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 팔로우추천카드 } from './pages/home-suggestions.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-313',
  name: '팔로우가 없는 새 계정으로 홈을 열면 「팔로우할 만한 사람」 카드가 보인다',
  precondition: ['가입하고 관리자가 이메일 확인을 마친 새 계정이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 추천 = new 팔로우추천카드(page);
  let 계정: 새계정 | undefined;

  await test.step('새 계정을 만들고 관리자가 이메일 확인을 마친다', async () => {
    계정 = await 확인된새계정만들기(page, params.adminId, params.adminPassword);
  });

  await test.step('새 계정으로 로그인해 있는지 확인한다', async () => {
    await 로그인하기(page, 계정?.이메일, 계정?.암호);
    await verify('로그인 뒤 로그인 화면이 아니다', new URL(page.url()).pathname.startsWith(로그인화면.주소), false, { blocker: true });
  });

  await test.step('팔로우가 없는 새 계정으로 홈을 연다', async () => {
    await 홈.열기();
    const 떴다 = await 추천.카드.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('팔로우가 없는 새 계정으로 홈을 열면 「팔로우할 만한 사람」 카드가 보인다', 떴다, true);
  });
});
