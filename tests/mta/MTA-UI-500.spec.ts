import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-500',
  name: '홈 · 목록 · 알림이 비었을 때 빈 화면 문구는 앱 기본 「리스트에 아무 것도 없습니다」이거나 각 화면 문구일 수 있다',
  platforms: ['android'],
  held: '보류 — 비어 있는 목록 · 알림이 있는 계정',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    빈목록이름: z.string().describe('글이 한 건도 없는 목록 이름'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('글이 없는 목록을 연다', async () => {
    await 홈.드롭다운열기();
    await verify('「목록」 하위 목록이 열린다', await 홈.드롭다운하위열기('목록'), true, { blocker: true });
    await 홈.드롭다운고르기(params.빈목록이름);
    await verify('홈 · 목록 · 알림이 비었을 때 빈 화면 문구는 앱 기본 「리스트에 아무 것도 없습니다」이거나 각 화면 문구일 수 있다', await 문구가보이나(driver, '리스트에 아무 것도 없습니다'), true);
  }, { capture: true });
});
