import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 게시기본값화면 } from './pages/set-posting.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-511',
  name: '게시 기본값을 바꾸고 화면을 나갔다가 다시 열면 게시 기본값은 화면을 나갈 때 서버에 저장된다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 게시 = new 게시기본값화면(driver);
  let 바꿈 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 게시 기본값을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('게시 기본값');
    await verify('게시 기본값 화면에 「게시 범위」 줄이 보인다', await 게시.떴나(), true, { blocker: true });
  });
  try {
    await test.step('게시 기본값을 바꾸고 화면을 나갔다가 다시 연다', async () => {
      await 게시.줄누르기('게시 범위');
      await 게시.선택지고르기('제한적 공개');
      바꿈 = true;
      await 게시.뒤로가기();
      await verify('계정 설정 화면으로 나온다', await 계정설정.떴나(), true);
      await 계정설정.줄누르기('게시 기본값');
      await verify('게시 기본값 화면이 다시 열린다', await 게시.떴나(), true);
      await verify('게시 기본값을 바꾸고 화면을 나갔다가 다시 열면 게시 기본값은 화면을 나갈 때 서버에 저장된다', await 게시.부제글('게시 범위'), '제한적 공개');
    }, { capture: true });
  } finally {
    if (바꿈) {
      await 게시.줄누르기('게시 범위');
      await 게시.선택지고르기('공개');
      await 게시.뒤로가기();
    }
  }
});
