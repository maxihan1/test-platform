import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-243',
  name: '수정 기록 첫 버전은 「원본 게시물」이고 이후 버전에 「내용을 수정함」 · 「열람 주의 추가함/수정함/삭제함」 · 「투표를 추가함/수정함/삭제함」 · 「미디어를 추가함/삭제함」 · 「미디어 순서를 바꿈」 · 「민감함으로 설정함」 · 「민감하지 않음으로 설정함」 요약이 붙는다',
  platforms: ['android'],
  held: '보류 — 수정 기록 화면의 요소 주소',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('minjun_dev 의 수정된 글 수정 기록을 연다', async () => {
    await verify('수정 기록 첫 버전은 「원본 게시물」이고 이후 버전에 「내용을 수정함」 · 「열람 주의 추가함/수정함/삭제함」 · 「투표를 추가함/수정함/삭제함」 · 「미디어를 추가함/삭제함」 · 「미디어 순서를 바꿈」 · 「민감함으로 설정함」 · 「민감하지 않음으로 설정함」 요약이 붙는다', await 문구가보이나(driver, '원본 게시물'), true);
  });
});
