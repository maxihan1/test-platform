import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게시범위기본값바꾸기, 글이될때까지, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-259',
  name: '게시 기본값의 게시 범위를 「팔로워」로 바꾸고 글쓰기를 열면 새 글의 기본 공개 범위는 설정 「게시 기본값」이다',
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
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('게시 기본값의 게시 범위를 「팔로워」로 바꾸고 글쓰기를 연다', async () => {
      await 게시범위기본값바꾸기(driver, '팔로워');
      await 글쓰기열기(driver);
      await verify('게시 기본값의 게시 범위를 「팔로워」로 바꾸고 글쓰기를 열면 새 글의 기본 공개 범위는 설정 「게시 기본값」이다', await 글이될때까지(driver, 글쓰기.공개범위글, '팔로워'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
    await 게시범위기본값바꾸기(driver, '공개');
  }
});
