import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-310',
  name: '프로필 본문에 자기소개 · 프로필 항목 · 「Followers」 · 「Following」 · 「게시물」 · 「가입」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    팔로워글: z.string().describe('팔로워 숫자 이름').default('Followers'),
    팔로잉글: z.string().describe('팔로잉 숫자 이름').default('Following'),
    게시물글: z.string().describe('게시물 숫자 이름').default('게시물'),
    가입글: z.string().describe('가입일 이름').default('가입'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('minjun_dev 프로필을 연다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    const 소개 = await verify('프로필 본문에 자기소개가 보인다', await 뜰때까지(driver, 프로필.자기소개, 10_000), true);
    const 항목 = await verify('프로필 본문에 프로필 항목이 보인다', await 뜰때까지(driver, 프로필.항목들, 10_000), true);
    const 팔로워 = await verify('프로필 본문에 「Followers」가 보인다', await 뜰때까지(driver, 프로필.카운터글(expected.팔로워글), 10_000), true);
    const 팔로잉 = await verify('프로필 본문에 「Following」이 보인다', await 뜰때까지(driver, 프로필.카운터글(expected.팔로잉글), 10_000), true);
    const 게시물 = await verify('프로필 본문에 「게시물」이 보인다', await 뜰때까지(driver, 프로필.카운터글(expected.게시물글), 10_000), true);
    const 가입 = await verify('프로필 본문에 「가입」이 보인다', await 뜰때까지(driver, 프로필.카운터글(expected.가입글), 10_000), true);
    await verify('프로필 본문에 자기소개 · 프로필 항목 · 「Followers」 · 「Following」 · 「게시물」 · 「가입」이 보인다', 소개 && 항목 && 팔로워 && 팔로잉 && 게시물 && 가입, true);
  });
});
