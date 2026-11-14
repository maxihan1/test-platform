import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 문구가보이나 } from './helpers/app.helper.js';
import { 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-205',
  name: '공개 범위 줄 설명은 「제한적 공개」 「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」 · 「팔로워」 「오직 팔로우 중인 사람들에게만」 · 「개인 멘션」 「게시물에 반응한 사람들에게만」이다',
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
    await test.step('공개 범위 시트의 공개 범위 선택 상자를 연다', async () => {
      await 공개시트.공개범위열기();
      const 제한 = await verify('「제한적 공개」 줄 설명이 「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」이다', await 문구가보이나(driver, '마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김'), true);
      const 팔로워 = await verify('「팔로워」 줄 설명이 「오직 팔로우 중인 사람들에게만」이다', await 문구가보이나(driver, '오직 팔로우 중인 사람들에게만'), true);
      const 멘션 = await verify('「개인 멘션」 줄 설명이 「게시물에 반응한 사람들에게만」이다', await 문구가보이나(driver, '게시물에 반응한 사람들에게만'), true);
      await verify('공개 범위 줄 설명은 「제한적 공개」 「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」 · 「팔로워」 「오직 팔로우 중인 사람들에게만」 · 「개인 멘션」 「게시물에 반응한 사람들에게만」이다', 제한 && 팔로워 && 멘션, true);
      await 뒤로(driver);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
