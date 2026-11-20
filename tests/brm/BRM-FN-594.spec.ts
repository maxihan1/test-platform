import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인상태줄글자색, 로그인상태줄이시작버튼아래인가, 로그인화면준비, 빨강인가 } from './helpers/login-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-594',
  name: '아이디 칸을 비우고 「게임 시작」을 누르면 창 아래에 빨간 글씨 「아이디와 비밀번호를 입력해 주세요」가 보인다',
  platforms: ['android'],
  precondition: ['로그인 화면이 떠 있다'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('로그인 화면을 연다', async () => {
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('아이디 칸을 비우고 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.아이디넣기('');
    await 화면.비밀번호넣기(나.비밀번호);
    await 화면.시작누르기();
    const 글 = await verify('「아이디와 비밀번호를 입력해 주세요」가 보인다', await 화면.상태글이될때까지('아이디와 비밀번호를 입력해 주세요'), true);
    const 색 = await verify('글씨가 빨간색이다', 빨강인가(await 로그인상태줄글자색(game)), true);
    const 아래 = await verify('글씨가 창 아래쪽에 있다', await 로그인상태줄이시작버튼아래인가(game), true);
    await verify('아이디 칸을 비우고 「게임 시작」을 누르면 창 아래에 빨간 글씨 「아이디와 비밀번호를 입력해 주세요」가 보인다', 글 && 색 && 아래, true);
  });
  await test.step('비밀번호 칸을 비우고 「게임 시작」을 누른다', async () => {
    const 화면 = await 로그인화면.열기(game);
    await 화면.아이디넣기(나.아이디);
    await 화면.비밀번호넣기('');
    await 화면.시작누르기();
    const 글 = await verify('다시 「아이디와 비밀번호를 입력해 주세요」가 보인다', await 화면.상태글이될때까지('아이디와 비밀번호를 입력해 주세요'), true);
    const 색 = await verify('다시 글씨가 빨간색이다', 빨강인가(await 로그인상태줄글자색(game)), true);
    const 아래 = await verify('다시 글씨가 창 아래쪽에 있다', await 로그인상태줄이시작버튼아래인가(game), true);
    await verify('창 아래에 빨간 글씨 「아이디와 비밀번호를 입력해 주세요」가 보인다', 글 && 색 && 아래, true);
  });
});
