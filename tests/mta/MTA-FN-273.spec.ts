import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글 } from './helpers/post.helper.js';
import { 내글모두지우기 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-273',
  name: '같은 항목 두 개로 투표 글을 게시하면 「게시물 작성 실패」 창에 「재시도」 · 「취소」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    항목: z.string().min(1).describe('투표 두 항목에 똑같이 적을 글').default('같은 항목'),
  }),
  expected: z.object({
    제목: z.string().describe('실패 창 제목').default('게시물 작성 실패'),
    재시도: z.string().describe('실패 창 단추 글자').default('재시도'),
    취소: z.string().describe('실패 창 단추 글자').default('취소'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 본문 = 표시글('같은 투표 항목 확인');
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  try {
    await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    });

    await test.step('같은 항목 두 개로 투표 글을 게시한다', async () => {
      await 글쓰기.본문적기(본문);
      await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
      await 글쓰기.투표항목적기(0, params.항목);
      await 글쓰기.투표항목적기(1, params.항목);
      await verify('「게시」가 켜진다', await 뜰때까지(driver, 글쓰기.게시켜짐, 10_000), true, { blocker: true });
      await driver.$(글쓰기.게시).click();
      const 제목 = await verify('실패 창 제목이 보인다', await 뜰때까지(driver, 글쓰기.창.안의글자(expected.제목), 20_000), true);
      const 재시도 = await verify('「재시도」가 보인다', await 뜰때까지(driver, 글쓰기.창단추(expected.재시도), 10_000), true);
      const 취소 = await verify('「취소」가 보인다', await 뜰때까지(driver, 글쓰기.창단추(expected.취소), 10_000), true);
      await verify('같은 항목 두 개로 투표 글을 게시하면 「게시물 작성 실패」 창에 「재시도」 · 「취소」가 보인다', 제목 && 재시도 && 취소, true);
      await driver.$(글쓰기.창단추(expected.취소)).click();
      await 글쓰기.나가기();
    });
  } finally {
    await 내글모두지우기(driver, 본문);
  }
});
