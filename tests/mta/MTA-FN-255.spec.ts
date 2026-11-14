import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-255',
  name: '팔로워 공개 · 개인 멘션이면 인용 정책이 「본인만」으로 잠기고 「마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.」 설명이 붙는다',
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
  const 공개시트 = new 공개범위시트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('공개 범위 시트를 연다', async () => {
      await 글쓰기.공개범위누르기();
      await verify('공개 범위 시트가 뜬다', await 공개시트.떴나(), true, { blocker: true });
    });
    await test.step('공개 범위 시트에서 「팔로워」를 고른다', async () => {
      await 공개시트.공개범위열기();
      await 공개시트.고르기('팔로워');
      const 잠김 = await verify('인용 정책이 「본인만」으로 잠긴다', await 공개시트.인용정책이될때까지('본인만'), true);
      const 설명 = await verify('「마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.」 설명이 보인다', await 문구가보이나(driver, '마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.'), true);
      await verify('팔로워 공개 · 개인 멘션이면 인용 정책이 「본인만」으로 잠기고 「마스토돈에서 작성된 팔로워 전용 게시물은 다른 사용자가 인용할 수 없습니다.」 설명이 붙는다', 잠김 && 설명, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
