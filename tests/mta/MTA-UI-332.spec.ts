import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-332',
  name: '팔로우 중인 사람 프로필 메뉴에 「목록에서 추가 또는 제거」 · 「Feature on my profile」 · 「부스트 숨기기」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    목록글: z.string().describe('프로필 메뉴 항목').default('목록에서 추가 또는 제거'),
    추천글: z.string().describe('프로필 메뉴 항목').default('Feature on my profile'),
    부스트글: z.string().describe('프로필 메뉴 항목').default('부스트 숨기기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('팔로우 중인 minjun_dev 프로필 메뉴를 연다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    await 프로필.메뉴열기();
    const 항목1 = await verify('프로필 메뉴에 「목록에서 추가 또는 제거」가 보인다', await 프로필.메뉴.뜰때까지(expected.목록글), true);
    const 항목2 = await verify('프로필 메뉴에 「Feature on my profile」가 보인다', await 프로필.메뉴.뜰때까지(expected.추천글), true);
    const 항목3 = await verify('프로필 메뉴에 「부스트 숨기기」가 보인다', await 프로필.메뉴.뜰때까지(expected.부스트글), true);
    await verify('팔로우 중인 사람 프로필 메뉴에 「목록에서 추가 또는 제거」 · 「Feature on my profile」 · 「부스트 숨기기」가 보인다', 항목1 && 항목2 && 항목3, true);
  });
});
