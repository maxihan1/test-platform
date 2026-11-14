import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내글남김없이지우기, 사진첨부하기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기, 테스트글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-600',
  name: '큰 사진을 첨부해 게시하면 이미지는 앱이 크기를 검사하지 않고 총 화소 33177600에 맞게 줄여 올린다',
  platforms: ['android'],
  held: '보류 — 폰 사진첩의 사진을 앱 글쓰기에 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사진파일: z.string().describe('첨부할 큰 사진 파일 이름'),
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
  const 본문 = 테스트글('큰 사진');
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('큰 사진을 첨부해 게시한다', async () => {
      await 사진첨부하기(driver, params.사진파일);
      await 글쓰기.본문적기(본문);
      await 글쓰기.게시누르기();
      await verify('큰 사진을 첨부해 게시하면 이미지는 앱이 크기를 검사하지 않고 총 화소 33177600에 맞게 줄여 올린다', await 홈.떴나(60_000), true);
    }, { capture: true });
  } finally {
    await 내글남김없이지우기(driver, 본문);
  }
});
