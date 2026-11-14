import { 한국어머리다시걸기 } from './helpers/page-setup.helper.js';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 초기상태바꾸기, type 풀기 } from './helpers/mock.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-964',
  name: '잠긴 계정이 공개 범위를 「팔로워」로 고르면 비공개상태 경고가 보이지 않는다',
  held: '보류 — 가짜 응답이 화면에 안 먹는다: 초기 상태의 내 계정 잠김 값을 바꿔도 글쓰기 경고가 그대로 뜬다',
  techniques: ['상태 전이'],
  precondition: ['내 계정 잠김 값은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);
  let 풀기함수: 풀기 | undefined;
  let 한국어풀기: 풀기 | undefined;

  await test.step('일반 회원으로 로그인하고 내 계정 잠김 값을 가짜로 바꾼 뒤 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    풀기함수 = await 초기상태바꾸기(page, {}, { locked: true });
    한국어풀기 = await 한국어머리다시걸기(page);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('잠긴 계정으로 작성 상자 공개 범위를 「팔로워」로 고른다', async () => {
      await 글쓰기.공개범위바꾸고저장('팔로워');
      await 글쓰기.공개범위버튼('팔로워').waitFor();
      const 떴다 = await 글쓰기.비공개경고.waitFor({ timeout: 3_000 }).then(() => true, () => false);
      await verify('잠긴 계정이 공개 범위를 「팔로워」로 고르면 비공개상태 경고가 보이지 않는다', 떴다, false);
    });
  } finally {
    if (한국어풀기 !== undefined) await 한국어풀기();
    if (풀기함수 !== undefined) await 풀기함수();
  }
});
