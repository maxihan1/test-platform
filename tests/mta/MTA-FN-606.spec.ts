import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 글자요소가보이나, 내글남김없이지우기, 사진첨부하기, 설정스위치바꾸기, 설정줄열기, 탭줄로돌아오기, 홈탭으로 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기, 테스트글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-606',
  name: '대체 텍스트 리마인더가 켜져 있고 설명 없는 이미지가 있으면 게시할 때 「미디어에 대체 텍스트가 없습니다」 / 「이미지 n개에 대체 텍스트를 입력하지 않았습니다.그대로 포스트 하시겠습니까?」 / 「게시」 · 「취소」 창이 뜬다',
  platforms: ['android'],
  held: '보류 — 폰 사진첩의 사진을 앱 글쓰기에 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사진파일: z.string().describe('설명이 없는 사진 파일 이름'),
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
  const 본문 = 테스트글('대체 텍스트 리마인더');
  try {
    await test.step('대체 텍스트 리마인더를 켜고 설명 없는 사진을 넣어 게시한다', async () => {
      await 설정줄열기(driver, ['동작']);
      await 설정스위치바꾸기(driver, '대체 텍스트 리마인더 추가', true);
      await 홈탭으로(driver);
      await 글쓰기열기(driver);
      await 사진첨부하기(driver, params.사진파일);
      await 글쓰기.본문적기(본문);
      await 글쓰기.게시누르기();
      const 제목 = await verify('게시할 때 「미디어에 대체 텍스트가 없습니다」가 보인다', await 문구가보이나(driver, '미디어에 대체 텍스트가 없습니다'), true);
      const 본문글 = await verify('게시할 때 「이미지 n개에 대체 텍스트를 입력하지 않았습니다.그대로 포스트 하시겠습니까?」가 보인다', await 문구가보이나(driver, '이미지 n개에 대체 텍스트를 입력하지 않았습니다.그대로 포스트 하시겠습니까?'), true);
      const 게시 = await verify('확인 창에 「게시」 버튼이 보인다', await 글자요소가보이나(driver, '게시'), true);
      const 취소 = await verify('확인 창에 「취소」 버튼이 보인다', await 글자요소가보이나(driver, '취소'), true);
      await verify('대체 텍스트 리마인더가 켜져 있고 설명 없는 이미지가 있으면 게시할 때 「미디어에 대체 텍스트가 없습니다」 / 「이미지 n개에 대체 텍스트를 입력하지 않았습니다.그대로 포스트 하시겠습니까?」 / 「게시」 · 「취소」 창이 뜬다', 제목 && 본문글 && 게시 && 취소, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
    await 설정줄열기(driver, ['동작']);
    await 설정스위치바꾸기(driver, '대체 텍스트 리마인더 추가', false);
    await 홈탭으로(driver);
    await 내글남김없이지우기(driver, 본문);
  }
});
