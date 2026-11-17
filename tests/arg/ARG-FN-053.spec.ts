import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 저장될때까지 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 결과화면 } from './pages/result.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-053',
  name: '골드를 바꾼 직후 접속을 끊으면 서버에 바뀐 골드가 저장된다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 로그인해 던전으로 간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호);
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 행동 막대가 보인다', await 던전화면.지금(game).보이나(던전화면.행동막대), true, { blocker: true });
    });

    await test.step('골드를 바꾼 직후 「메인 메뉴로」 나간다', async () => {
      await GM(game, '/gm gold 500');
      await GM(game, '/gm faint');
      const 결과 = await 결과화면.열기(game);
      await 결과.메인메뉴로누르기();
      const 서버 = await 저장될때까지(admin, 아이디, (값) => 값.골드 === 500, 15_000);
      await verify('골드를 바꾼 직후 접속을 끊으면 서버에 바뀐 골드가 저장된다', 서버.골드, 500);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
