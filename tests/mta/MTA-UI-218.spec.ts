import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 문구가보이나 } from './helpers/app.helper.js';
import { 글읽기, 뒤로가기로확인창띄우기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-218',
  name: '내용이 있는 글쓰기를 닫거나 뒤로 가면 「작성 중인 글을 지우시겠습니까?」 / 「지우기」 · 「취소」 창이 뜬다',
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
  const 확인 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('글쓰기 본문을 적고 뒤로 가기를 누른다', async () => {
      await 글쓰기.본문적기('지우기 확인 글');
      await verify('뒤로 가기를 누른 뒤 확인 창이 뜬다', await 뒤로가기로확인창띄우기(driver), true, { blocker: true });
      const 질문 = await verify('확인 창에 「작성 중인 글을 지우시겠습니까?」가 보인다', await 문구가보이나(driver, '작성 중인 글을 지우시겠습니까?'), true);
      const 지우기 = await verify('확인 창에 「지우기」 버튼이 보인다', await 글읽기(driver, 확인.확인), '지우기');
      const 취소 = await verify('확인 창에 「취소」 버튼이 보인다', await 글읽기(driver, 확인.취소), '취소');
      await verify('내용이 있는 글쓰기를 닫거나 뒤로 가면 「작성 중인 글을 지우시겠습니까?」 / 「지우기」 · 「취소」 창이 뜬다', 질문 && 지우기 && 취소, true);
      await 확인.취소누르기();
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
