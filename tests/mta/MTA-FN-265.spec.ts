import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 내글남김없이지우기, 본문조각글수, 빠르게두번누르기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기, 테스트글 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-265',
  name: '글쓰기 본문을 적고 「게시」를 빠르게 두 번 누르면 「게시」를 빠르게 두 번 눌러도 그 글은 내 프로필에 하나만 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
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
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  const 본문 = 테스트글('두 번 누르기');
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('글쓰기 본문을 적고 「게시」를 빠르게 두 번 누른다', async () => {
      await 글쓰기.본문적기(본문);
      await 빠르게두번누르기(driver, 글쓰기.게시);
      await verify('게시한 뒤 홈이 보인다', await 홈.떴나(60_000), true, { blocker: true });
    });
    await test.step('내 프로필에서 올린 글을 확인한다', async () => {
      await 홈.탭.누르기('프로필');
      await 카드.본문찾기(본문);
      await verify('글쓰기 본문을 적고 「게시」를 빠르게 두 번 누르면 「게시」를 빠르게 두 번 눌러도 그 글은 내 프로필에 하나만 보인다', await 본문조각글수(driver, 본문), 1);
    }, { capture: true });
  } finally {
    await 내글남김없이지우기(driver, 본문);
  }
});
