import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임다시켜기, 손님봇켜기, 접속자에서빠질때까지 } from './helpers/connect.helper.js';
import { 계정되돌리기, 봇끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 접속안내창 } from './pages/notice.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-004',
  name: '서버에 7명이 있을 때 로그인하면 로비로 넘어간다',
  platforms: ['android'],
  precondition: ['손님 봇 7명이 접속해 있다', '손님 봇 8명이 접속해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    let 화면 = 로그인화면.지금(game);
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 손님 봇 7명을 접속시킨다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 손님봇켜기(admin, 7);
      화면 = await 로그인화면.열기(game);
    });
    await test.step('서버에 7명이 있을 때 일반 회원으로 로그인한다', async () => {
      await 화면.로그인(아이디, 비밀번호);
      const 넘어갔다 = await game.waitFor(로비화면.준비, { timeoutMs: 60_000 }).then(
        () => true,
        () => false,
      );
      await verify('서버에 7명이 있을 때 로그인하면 로비로 넘어간다', 넘어갔다, true);
    });
    await test.step('게임을 다시 켜고 손님 봇 하나를 더 접속시킨다', async () => {
      화면 = await 게임다시켜기(driver, game);
      await 접속자에서빠질때까지(admin, 아이디);
      await 손님봇켜기(admin, 1, 8);
    });
    await test.step('서버에 8명이 있을 때 일반 회원으로 로그인한다', async () => {
      await 화면.로그인(아이디, 비밀번호);
      const 창 = await 접속안내창.제목이될때까지(game, '접속 실패');
      const 제목 = await verify('「접속 실패」 창이 보인다', (await 창?.제목글()) === '접속 실패', true);
      const 본문 = (await 창?.본문글()) ?? '';
      const 글1 = await verify('창에 「서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요」 문구가 보인다', 본문.includes('서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요'), true);
      await verify('서버에 8명이 있을 때는 「접속 실패」 창에 「서버 인원이 가득 찼습니다. 잠시 뒤 다시 시도해 주세요」가 보인다', 제목 && 글1, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
