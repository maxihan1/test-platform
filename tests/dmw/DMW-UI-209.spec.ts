import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-209',
  name: '회원정보 수정에 들어가면 먼저 비밀번호 입력칸과 「비밀번호 확인」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 회원정보수정화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.loginId, params.loginPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('회원정보 수정을 연다', async () => {
    await 화면.열기();
    const 입력칸 = await verify('비밀번호 입력칸이 보인다', await 화면.비밀번호칸.isVisible(), true);
    const 버튼 = await verify('「비밀번호 확인」 버튼이 보인다', await 화면.비밀번호확인버튼.isVisible(), true);
    await verify('회원정보 수정에 들어가면 먼저 비밀번호 입력칸과 「비밀번호 확인」 버튼이 보인다', 입력칸 && 버튼, true);
  });
});
