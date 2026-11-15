import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-320',
  name: '고정 글이 둘 이상인 프로필 맨 위에 「Pinned」 글과 「View all pinned posts」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    고정글: z.string().describe('고정 글 표시').default('Pinned'),
    모두보기: z.string().describe('고정 글 모아 보기 글').default('View all pinned posts'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('고정 글이 둘인 hana_photo 프로필을 연다', async () => {
    await 프로필열기(driver, 'hana_photo');
    const 고정 = await verify('프로필 맨 위에 「Pinned」 글이 보인다', await 뜰때까지(driver, 프로필.굴려서글자포함(expected.고정글), 15_000), true);
    const 모두 = await verify('프로필 맨 위에 「View all pinned posts」가 보인다', await 뜰때까지(driver, 프로필.굴려서글자포함(expected.모두보기), 15_000), true);
    await verify('고정 글이 둘 이상인 프로필 맨 위에 「Pinned」 글과 「View all pinned posts」가 보인다', 고정 && 모두, true);
  });
});
