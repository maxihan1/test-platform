import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 세션읽기 } from './helpers/users-flow.helper.js';
import { 권한없음화면 } from './pages/forbidden.page.js';

export const spec = defineCase({
  tcId: 'DMO-FN-006',
  name: '일반 회원으로 /ops 를 열면 「권한이 없습니다」 화면이 보인다',
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

  await test.step('일반 회원 계정으로 로그인해 있음을 확인한다', async () => {
    await API로그인(page, params.loginId ?? '', params.loginPassword ?? '');
    const 세션 = await 세션읽기(page);
    await verify('일반 회원 계정으로 로그인해 있다', 세션 !== null && 세션.role !== 'admin', true, { blocker: true });
  });

  await test.step('/ops 를 연다', async () => {
    await page.goto(권한없음화면.주소);
    await 권한없음.홈으로.waitFor();
    await verify('일반 회원으로 /ops 를 열면 「권한이 없습니다」 화면이 보인다', await 권한없음.제목.isVisible(), true);
  });
});
