import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기버리고나오기, 글읽기, 누르기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 부스트시트 } from './pages/boost-sheet.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-172',
  name: '글쓰기 본문 힌트는 「당신의 생각을 입력하거나 붙여넣으세요」이고 인용 중에는 「대화에 무언가를 추가하세요」다',
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
  const 부스트창 = new 부스트시트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
      const 새글 = await verify('새 글쓰기 본문 힌트가 「당신의 생각을 입력하거나 붙여넣으세요」다', await 글읽기(driver, 글쓰기.본문칸), '당신의 생각을 입력하거나 붙여넣으세요');
      await 글쓰기버리고나오기(driver);
      await 누르기(driver, 홈.부스트들);
      await 부스트창.고르기('인용하기');
      await verify('인용 글쓰기가 열린다', await 글쓰기.떴나(), true, { blocker: true });
      const 인용 = await verify('인용 중 본문 힌트가 「대화에 무언가를 추가하세요」다', await 글읽기(driver, 글쓰기.본문칸), '대화에 무언가를 추가하세요');
      await verify('글쓰기 본문 힌트는 「당신의 생각을 입력하거나 붙여넣으세요」이고 인용 중에는 「대화에 무언가를 추가하세요」다', 새글 && 인용, true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
