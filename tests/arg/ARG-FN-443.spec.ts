import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 승리결과화면으로 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 결과화면 } from './pages/result.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-443',
  name: '결과 화면에서 「메인 메뉴로」를 누르면 접속을 끊고 로그인 창이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 승리해 결과 화면에 있다'],
  elements: ['zone:Dungeon'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 보스를 처치해 승리 결과 화면을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 승리결과화면으로(game, 아이디, 비밀번호);
    });
    await test.step('결과 화면이 열려 있는지 확인한다', async () => {
      await verify('결과 화면에 「메인 메뉴로」 버튼이 보인다', await 결과화면.지금(game).보이나(결과화면.메인메뉴로), true, { blocker: true });
    });

    await test.step('「메인 메뉴로」를 누른다', async () => {
      await 결과화면.지금(game).메인메뉴로누르기();
      const 로그인창 = await game.waitFor(로그인화면.게임시작, { timeoutMs: 30_000 }).then(
        () => true,
        () => false,
      );
      await verify('결과 화면에서 「메인 메뉴로」를 누르면 접속을 끊고 로그인 창이 보인다', 로그인창, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
