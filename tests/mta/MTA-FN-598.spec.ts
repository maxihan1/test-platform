import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 사진첨부하기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-598',
  name: '지원하지 않는 형식의 파일을 첨부하면 첨부 형식은 이미지(jpeg · png · gif · heic · heif · webp · avif) · 영상(webm · mp4 · quicktime · ogg · asf) · 오디오(wav · ogg · mpeg · mp3 · webm · flac · aac · m4a · mp4 · 3gpp)이고 그 밖은 토스트 「<파일> 파일은 지원되지 않는 타입입니다」가 보인다',
  platforms: ['android'],
  held: '보류 — 폰 사진첩의 파일을 앱 글쓰기에 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    지원하지않는파일: z.string().describe('첨부할 지원하지 않는 형식의 파일 이름'),
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
    });
    await test.step('지원하지 않는 형식의 파일을 첨부한다', async () => {
      await 사진첨부하기(driver, params.지원하지않는파일);
      await verify('지원하지 않는 형식의 파일을 첨부하면 첨부 형식은 이미지(jpeg · png · gif · heic · heif · webp · avif) · 영상(webm · mp4 · quicktime · ogg · asf) · 오디오(wav · ogg · mpeg · mp3 · webm · flac · aac · m4a · mp4 · 3gpp)이고 그 밖은 토스트 「<파일> 파일은 지원되지 않는 타입입니다」가 보인다', await 문구가보이나(driver, '<파일> 파일은 지원되지 않는 타입입니다'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
