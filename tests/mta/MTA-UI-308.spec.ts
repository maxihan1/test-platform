import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-308',
  name: '역할이 있는 계정 프로필에 역할 이름 배지가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다', '역할이 있는 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('프로필을 열 계정의 사용자명 — 역할이 있는 시드 계정').default('qa_admin'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('qa_admin 프로필을 연다', async () => {
    await 프로필열기(driver, params.사용자명);
    await verify('프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await verify(
      '역할이 있는 계정 프로필에 역할 이름 배지가 보인다',
      await 될때까지(driver, async () => (await 프로필.이름줄배지글들()).length > 0, 10_000),
      true,
    );
  });
});
