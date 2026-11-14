import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글읽기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-207',
  name: '도구 줄의 공개 범위 버튼 문구는 「공개, 누구나 인용 가능」 · 「공개, 인용 제한」 · 「공개, 인용 비활성화」 · 「조용한 공개, …」 · 「팔로워」 · 「개인 멘션」 중 하나다',
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
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
      const 글 = await 글읽기(driver, 글쓰기.공개범위글);
      await verify('도구 줄의 공개 범위 버튼 문구는 「공개, 누구나 인용 가능」 · 「공개, 인용 제한」 · 「공개, 인용 비활성화」 · 「조용한 공개, …」 · 「팔로워」 · 「개인 멘션」 중 하나다', ['공개, 누구나 인용 가능', '공개, 인용 제한', '공개, 인용 비활성화', '팔로워', '개인 멘션'].includes(글) || 글.startsWith('조용한 공개, '), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
