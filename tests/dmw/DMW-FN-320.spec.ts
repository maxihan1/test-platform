import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 화면제목 } from './components/page-heading.component.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-320',
  name: '일반 회원이 /admin 을 열면 「권한이 없습니다」 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 제목 = new 화면제목(page);

  await test.step('회원으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.loginId, params.loginPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('일반 회원으로 /admin 을 연다', async () => {
    await page.goto(관리자화면.주소);
    await 제목.큰제목.waitFor();
    await verify('일반 회원이 /admin 을 열면 「권한이 없습니다」 화면이 보인다', await 제목.글('권한이 없습니다').isVisible(), true);
  });
});
