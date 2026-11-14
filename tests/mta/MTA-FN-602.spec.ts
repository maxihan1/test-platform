import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜰때까지 } from './helpers/app.helper.js';
import { 손잡이끌어지우기, 탭줄로돌아오기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글쓰기열기 } from './helpers/post.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-602',
  name: '투표 항목이 2개면 끌어서 지울 수 없다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  held: '보류 — 투표 손잡이를 잡을 요소 주소',
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
    await test.step('투표 항목 2개에서 손잡이를 끌어 지우려 한다', async () => {
      await 손잡이끌어지우기(driver, 글쓰기.투표손잡이들, 1);
      await verify('투표 항목이 2개면 끌어서 지울 수 없다', await 글쓰기.투표항목수(), 2);
    });
    await test.step('투표 항목 3개에서 손잡이를 삭제 영역으로 끈다', async () => {
      await 글쓰기.투표항목추가누르기();
      await 손잡이끌어지우기(driver, 글쓰기.투표손잡이들, 1);
      await verify('투표 항목 3개에서는 손잡이를 삭제 영역으로 끌어 지운다', await 글쓰기.투표항목수(), 2);
    }, { capture: true });
  } finally {
    await 탭줄로돌아오기(driver);
  }
});
