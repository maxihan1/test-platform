import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내이름 } from './helpers/member-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-006',
  name: '회원 머리글 오른쪽에 「<이름>님」 · 「마이페이지」 · 「로그아웃」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);
  await 계정으로로그인(page, params.loginId, params.loginPassword);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('회원으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
    const 이름 = await 내이름(page);
    const 인사 = await verify('머리글 오른쪽에 「<이름>님」이 보인다', await 홈.머리글이름(이름).isVisible(), true);
    const 마이페이지 = await verify('머리글 오른쪽에 「마이페이지」가 보인다', await 홈.머리.마이페이지.isVisible(), true);
    const 로그아웃 = await verify('머리글 오른쪽에 「로그아웃」이 보인다', await 홈.머리.로그아웃.isVisible(), true);
    await verify('회원 머리글 오른쪽에 「<이름>님」 · 「마이페이지」 · 「로그아웃」이 보인다', 인사 && 마이페이지 && 로그아웃, true);
  });
});
