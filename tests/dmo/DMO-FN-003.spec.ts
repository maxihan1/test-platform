import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 권한없음화면 } from './pages/forbidden.page.js';
import { 회원관리화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-003',
  name: '일반 회원으로 /ops/users 를 열면 「회원 관리」 제목이 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['일반 회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 권한없음 = new 권한없음화면(page);
  const 회원 = new 회원관리화면(page);

  await test.step('일반 회원 계정으로 로그인해 있음을 확인한다', async () => {
    await API로그인(page, params.loginId ?? '', params.loginPassword ?? '');
    const 세션 = await 세션읽기(page);
    await verify('일반 회원 계정으로 로그인해 있다', 세션 !== null && 세션.role !== 'admin', true, { blocker: true });
  });

  await test.step('/ops/users 를 연다', async () => {
    await page.goto(회원관리화면.주소);
    await 권한없음.홈으로.waitFor();
    await verify('일반 회원으로 /ops/users 를 열면 「회원 관리」 제목이 보이지 않는다', await 회원.제목.isVisible(), false);
  });
});
