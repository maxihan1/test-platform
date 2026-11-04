import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내이름 } from './helpers/member-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-006',
  name: '회원 머리글은 넓은 화면에서 「<이름>님」 · 「마이페이지」 · 「로그아웃」을 보여 주고 768px 이하에서는 「마이페이지」 · 「로그아웃」만 보여 준다',
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

  await test.step('화면 너비를 1280px 로 두고 홈 화면을 연다', async () => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await 홈.열기();
    await verify('회원으로 로그인해 있다', await 홈.머리.로그아웃.isVisible(), true, { blocker: true });
    const 이름 = await 내이름(page);
    const 인사 = await verify('1280px 머리글 오른쪽에 「<이름>님」이 보인다', await 홈.머리글이름(이름).isVisible(), true);
    const 마이페이지 = await verify('1280px 머리글 오른쪽에 「마이페이지」가 보인다', await 홈.머리.마이페이지.isVisible(), true);
    const 로그아웃 = await verify('1280px 머리글 오른쪽에 「로그아웃」이 보인다', await 홈.머리.로그아웃.isVisible(), true);
    await verify('화면 너비가 1280px 이면 회원 머리글 오른쪽에 「<이름>님」 · 「마이페이지」 · 「로그아웃」이 보인다', 인사 && 마이페이지 && 로그아웃, true);
  });

  await test.step('화면 너비를 768px 로 두고 홈 화면을 연다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 홈.열기();
    await verify('768px 에서도 회원으로 로그인해 있다', await 홈.머리.로그아웃.count(), 1, { blocker: true });
    const 이름 = await 내이름(page);
    const 숨김 = await verify('768px 머리글에 「<이름>님」이 보이지 않는다', await 홈.머리글이름(이름).isVisible(), false);
    const 마이페이지 = await verify('768px 머리글에 「마이페이지」가 보인다', await 홈.머리.마이페이지.isVisible(), true);
    const 로그아웃 = await verify('768px 머리글에 「로그아웃」이 보인다', await 홈.머리.로그아웃.isVisible(), true);
    await verify('화면 너비가 768px 이면 회원 머리글에 「<이름>님」은 보이지 않고 「마이페이지」 · 「로그아웃」만 보인다', 숨김 && 마이페이지 && 로그아웃, true);
  });
});
