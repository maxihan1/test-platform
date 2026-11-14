import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 북마크화면 } from './pages/bookmarks.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-968',
  name: '북마크한 글이 없을 때 북마크 화면을 열면 「아직 북마크에 저장한 게시물이 없습니다. 게시물을 북마크 지정하면 여기에 나타납니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['북마크 목록 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 북마크목록 = new 북마크화면(page);
  let 풀기함수: 풀기 | undefined;

  await test.step('일반 회원으로 로그인하고 북마크 목록 응답을 빈 목록으로 바꾼다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    풀기함수 = await 가짜응답(page, /\/api\/v1\/bookmarks/, { 본문: [] });
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('북마크한 글이 없을 때 북마크 화면을 연다', async () => {
      await 북마크목록.열기();
      const 떴다 = await 북마크목록.안내('아직 북마크에 저장한 게시물이 없습니다. 게시물을 북마크 지정하면 여기에 나타납니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('북마크한 글이 없을 때 북마크 화면을 열면 「아직 북마크에 저장한 게시물이 없습니다. 게시물을 북마크 지정하면 여기에 나타납니다.」가 보인다', 떴다, true);
    });
  } finally {
    if (풀기함수 !== undefined) await 풀기함수();
  }
});
