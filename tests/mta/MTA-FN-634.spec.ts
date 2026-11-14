import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 사진공유보내기 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 공유받기화면 } from './pages/share.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-634',
  name: '이미지 · 영상 공유(ACTION_SEND_MULTIPLE 포함)는 첨부로 붙고 4개와 형식 검사를 넘으면 글쓰기 토스트가 나온다',
  platforms: ['android'],
  held: '보류 — 폰에 둔 사진을 공유로 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사진주소: z.string().describe('공유로 보낼 사진 주소(content:// 또는 file://)'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 공유 = new 공유받기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('앱에 사진 공유를 보낸다', async () => {
    await 사진공유보내기(driver, params.사진주소);
    await verify('이미지 · 영상 공유(ACTION_SEND_MULTIPLE 포함)는 첨부로 붙고 4개와 형식 검사를 넘으면 글쓰기 토스트가 나온다', await 공유.글쓰기떴나(), true);
  }, { capture: true });
});
