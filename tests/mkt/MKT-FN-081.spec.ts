import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 계정값 } from './helpers/account.helper.js';
import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-081',
  name: '비밀번호 칸에서 Enter 를 치면 로그인되어 홈 화면으로 간다',
  precondition: ['비회원이다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('아이디와 비밀번호를 적고 비밀번호 칸에서 Enter 를 친다', async () => {
    await 방해막기(page);
    await 로그인.열기();
    await 로그인.제목.waitFor();
    await 로그인.아이디.fill(계정.loginId);
    await 로그인.비밀번호.fill(계정.password);
    await 로그인.비밀번호.press('Enter');
    await 머리.로그아웃.waitFor();
    await verify('비밀번호 칸에서 Enter 를 치면 로그인되어 홈 화면으로 간다', { 로그인됨: (await 세션아이디(page)) === 계정.loginId, 화면: 경로(page) }, { 로그인됨: true, 화면: '/' });
  });
});
