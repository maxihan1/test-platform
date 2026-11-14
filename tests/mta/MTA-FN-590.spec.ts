import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기, 위로밀기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-590',
  name: '홈을 내린 뒤 다른 탭으로 옮기면 홈 탭이 가려질 때 읽던 맨 위 글 위치를 서버 읽음 위치(마커)에 저장한다',
  platforms: ['android'],
  held: '보류 — 서버 읽음 위치를 읽을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈을 내린 뒤 다른 탭으로 옮긴다', async () => {
    await 위로밀기(driver, 2);
    const 읽던글 = await 홈.첫글();
    await 홈.탭.누르기('둘러보기');
    await 앱다시켜기(driver);
    await verify('홈을 내린 뒤 다른 탭으로 옮기면 홈 탭이 가려질 때 읽던 맨 위 글 위치를 서버 읽음 위치(마커)에 저장한다', await 홈.첫글(), 읽던글);
  }, { capture: true });
});
