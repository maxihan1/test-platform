import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 뒤로가기로확인창띄우기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-271',
  name: '글쓰기를 지우고 다시 열면 앞 내용이 남아 있지 않다(앱 안 임시 저장 없음)',
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
    await test.step('글쓰기 본문을 적고 지운 뒤 글쓰기를 다시 연다', async () => {
      await 글쓰기.본문적기('지워질 글');
      await verify('뒤로 가기를 누른 뒤 확인 창이 뜬다', await 뒤로가기로확인창띄우기(driver), true, { blocker: true });
      await 확인.확인누르기();
      await verify('글쓰기를 지운 뒤 홈이 보인다', await 홈.떴나(), true, { blocker: true });
      await 글쓰기열기(driver);
      await verify('글쓰기를 지우고 다시 열면 앞 내용이 남아 있지 않다(앱 안 임시 저장 없음)', !(await 글쓰기.본문글()).includes('지워질 글'), true);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
