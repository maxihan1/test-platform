import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈으로돌아가기 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글올리기, 내글지우기, 테스트글 } from './helpers/post.helper.js';
import { 수정기록화면 } from './pages/edit-history.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 인용글쓰기화면 } from './pages/quote-compose.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-298',
  name: '변경이 둘 이상이면 수정 기록 요약이 「게시물 수정함」이다',
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
  const 인용 = new 인용글쓰기화면(driver);
  const 상세 = new 글상세화면(driver);
  const 기록 = new 수정기록화면(driver);
  const 원글 = 테스트글('수정 기록');
  const 경고글 = 테스트글('열람 주의');
  let 지울글 = '';

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('홈에서 내 새 글을 올린다', async () => {
      await 글올리기(driver, 원글);
      지울글 = 원글;
    });

    await test.step('내 새 글의 본문과 열람 주의를 같이 고쳐 저장하고 수정 기록을 연다', async () => {
      await 인용.수정열기(원글);
      await 인용.본문덧붙이기(' 수정함');
      await 인용.경고달기(경고글);
      await 인용.게시하고홈기다리기();
      지울글 = 경고글;
      await 인용.경고글펼치고열기(경고글, 원글);
      await verify('글 상세 확장 푸터가 보인다', await 상세.떴나(), true);
      await 상세.마지막수정누르기();
      await verify('변경이 둘 이상이면 수정 기록 요약이 「게시물 수정함」이다', await 기록.글보이나('게시물 수정함'), true);
    }, { capture: true });
  } finally {
    if (지울글 !== '') {
      await 홈으로돌아가기(driver);
      await 내글지우기(driver, 지울글);
    }
  }
});
