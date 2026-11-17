import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 오른쪽아래인가 } from './helpers/battle.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-058',
  name: '던전 오른쪽 아래 행동 막대에 「공격」 · 「스킬 1」 · 「스킬 2」 · 「감정」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 탱커로 던전에 들어간다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 던전으로(game, 아이디, 비밀번호, 0);
    });
    await test.step('던전에 들어왔는지 확인한다', async () => {
      await verify('던전에 행동 막대가 보인다', await 던전화면.지금(game).뜰때까지(던전화면.행동막대), true, { blocker: true });
    });

    await test.step('행동 막대를 확인한다', async () => {
      const 화면 = 던전화면.지금(game);
      const 자리 = await verify('행동 막대가 오른쪽 아래에 있다', await 오른쪽아래인가(game, 던전화면.행동막대), true);
      const 공격 = await verify('「공격」 버튼이 보인다', await 화면.보이나(던전화면.공격), true);
      const 스킬1 = await verify('「스킬 1」 버튼이 보인다', await 화면.보이나(던전화면.스킬1), true);
      const 스킬2 = await verify('「스킬 2」 버튼이 보인다', await 화면.보이나(던전화면.스킬2), true);
      const 감정 = await verify('「감정」 버튼이 보인다', await 화면.보이나(던전화면.감정), true);
      await verify('던전 오른쪽 아래 행동 막대에 「공격」 · 「스킬 1」 · 「스킬 2」 · 「감정」 버튼이 보인다', 자리 && 공격 && 스킬1 && 스킬2 && 감정, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
