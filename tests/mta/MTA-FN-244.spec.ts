import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-244',
  name: '투표 첫 항목 손잡이를 둘째 자리로 끌면 두 항목의 순서가 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    첫항목: z.string().min(1).describe('투표 첫째 항목에 적을 글').default('첫째 항목'),
    둘째항목: z.string().min(1).describe('투표 둘째 항목에 적을 글 — 첫째 항목과 다른 글').default('둘째 항목'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('투표 항목 손잡이를 끌어 순서를 바꾼다', async () => {
    await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
    await 글쓰기.투표항목적기(0, params.첫항목);
    await 글쓰기.투표항목적기(1, params.둘째항목);
    await 글쓰기.투표항목끌기(0, 1);
    const 첫칸 = await verify('첫째 칸이 처음 둘째 항목의 글로 바뀐다', await 될때까지(driver, async () => (await 글쓰기.투표항목글(0)) === params.둘째항목, 10_000), true);
    const 둘째칸 = await verify('둘째 칸 글이 처음 첫째 항목의 글이다', await 글쓰기.투표항목글(1), params.첫항목);
    await verify('투표 첫 항목 손잡이를 둘째 자리로 끌면 두 항목의 순서가 바뀐다', 첫칸 && 둘째칸, true);
  });
});
