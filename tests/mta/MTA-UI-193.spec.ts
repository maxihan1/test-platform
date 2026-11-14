import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 뜰때까지 } from './helpers/app.helper.js';
import { 글자요소가보이나, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-193',
  name: '투표 방식은 「선택해 주세요」(단일) · 「다중 선택」이다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('글쓰기를 연다', async () => {
      await 글쓰기열기(driver);
      await verify('글쓰기 본문 칸이 보인다', await 글쓰기.떴나(), true, { blocker: true });
    });
    await test.step('투표 영역을 연다', async () => {
      await 글쓰기.투표누르기();
      await verify('투표 영역이 보인다', await 뜰때까지(driver, 글쓰기.투표영역), true, { blocker: true });
    });
    await test.step('투표 영역에서 「스타일」을 누른다', async () => {
      await 글쓰기.설문스타일누르기();
      const 단일 = await verify('스타일 선택지에 「선택해 주세요」가 보인다', await 글자요소가보이나(driver, '선택해 주세요'), true);
      const 다중 = await verify('스타일 선택지에 「다중 선택」이 보인다', await 글자요소가보이나(driver, '다중 선택'), true);
      await verify('투표 방식은 「선택해 주세요」(단일) · 「다중 선택」이다', 단일 && 다중, true);
      await 뒤로(driver);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
