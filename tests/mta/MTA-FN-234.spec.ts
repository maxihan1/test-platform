import { defineCase, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-234',
  name: '투표 항목에 50자를 적으면 50자가 그대로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    항목글: z.string().min(1).describe('투표 첫째 항목에 적을 글 — 50자').default('가나다라마바사아자차가나다라마바사아자차가나다라마바사아자차가나다라마바사아자차가나다라마바사아자차'),
  }),
  expected: z.object({
    힌트: z.string().describe('첫째 항목 칸 힌트').default('옵션 1'),
    글자수: z.number().int().describe('적은 글자 수').default(50),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('투표 항목에 50자를 적는다', async () => {
    await verify('투표 영역이 보인다', await 글쓰기.투표열기(), true, { blocker: true });
    await 글쓰기.투표항목적기(0, params.항목글);
    await 될때까지(driver, async () => (await 글쓰기.투표항목글(0)) !== expected.힌트, 10_000);
    const 글자수 = await verify('투표 항목 글자 수가 기대값과 같다', (await 글쓰기.투표항목글(0)).length, expected.글자수);
    const 같다 = await verify('투표 항목 글이 적은 글과 같다', await 글쓰기.투표항목글(0), params.항목글);
    await verify('투표 항목에 50자를 적으면 50자가 그대로 보인다', 글자수 && 같다, true);
  });
});
