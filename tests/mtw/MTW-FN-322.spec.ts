import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 한국어로 } from './helpers/page-setup.helper.js';
import { type 새계정, 확인된새계정만들기 } from './helpers/signup.helper.js';
import { 로그인화면 } from './pages/sign-in.page.js';
import { 시작하기화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-322',
  name: '새 계정으로 처음 시작하기를 열면 「사람들을 팔로우하기」가 먼저 보인다',
  precondition: ['가입하고 관리자가 이메일 확인을 마친 새 계정이 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 시작 = new 시작하기화면(page);
  const 로그인 = new 로그인화면(page);
  let 계정: 새계정 | undefined;

  await test.step('새 계정을 만들고 관리자가 이메일 확인을 마친다', async () => {
    계정 = await 확인된새계정만들기(page, params.adminId, params.adminPassword);
    await 한국어로(page);
    await 로그인.열기();
    await verify('로그인 화면이 열려 있다', await 로그인.로그인버튼.isVisible(), true, { blocker: true });
  });

  await test.step('새 계정으로 처음 로그인해 시작하기를 연다', async () => {
    await 로그인하기(page, 계정?.이메일, 계정?.암호);
    await 시작.그려질때까지();
    await verify('새 계정으로 처음 시작하기를 열면 「사람들을 팔로우하기」가 먼저 보인다', await 시작.제목.isVisible(), true);
  });

  await test.step('「다음: 프로필 설정」을 누른다', async () => {
    await 시작.다음단계.click();
    const 떴다 = await 시작.프로필설정제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('다음 단계로 「프로필 설정」이 보인다', 떴다, true);
  });
});
