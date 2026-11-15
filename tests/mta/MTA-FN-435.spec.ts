import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 글이될때까지읽기, 스낵바글기다리기, 차단풀기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 뮤트차단시트 } from './pages/mute-block-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-435',
  name: '차단한 사람의 차단을 풀면 확인 없이 스낵바 「차단 해제」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    차단글: z.string().describe('차단한 프로필의 동작 버튼 글').default('Unblock'),
    해제글: z.string().describe('차단을 풀 때 스낵바에 들어가는 글').default('차단 해제'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 시트 = new 뮤트차단시트(driver);
  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('qa_blank 를 차단한 뒤 차단을 푼다', async () => {
      await 프로필열기(driver, 'qa_blank');
      await 프로필.메뉴열기();
      await 프로필.메뉴항목누르기('Block account');
      await 시트.단추누르기('차단');
      await verify('차단한 프로필의 동작 버튼이 「Unblock」으로 보인다', await 글이될때까지읽기(driver, 프로필.동작버튼, expected.차단글), expected.차단글, { blocker: true });
      await 프로필.동작누르기();
      const 글 = await 스낵바글기다리기(driver, expected.해제글);
      await verify('차단한 사람의 차단을 풀면 확인 없이 스낵바 「차단 해제」가 보인다', 글.includes(expected.해제글), true);
    });
  } finally {
    await 차단풀기(driver, 'qa_blank');
  }
});
