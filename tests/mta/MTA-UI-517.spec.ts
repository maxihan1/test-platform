import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-517',
  name: '내 「추천」 탭이 비어 있으면 「Showcase your favorite accounts」가 보인다',
  platforms: ['android'],
  held: '보류 — 추천 탭이 빈 계정',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('추천 탭이 빈 계정의 「추천」 탭을 연다', async () => {
    await 프로필.내프로필열기();
    await 프로필.탭누르기('추천');
    await verify('내 「추천」 탭이 비어 있으면 「Showcase your favorite accounts」가 보인다', await 문구가보이나(driver, 'Showcase your favorite accounts'), true);
  }, { capture: true });
});
