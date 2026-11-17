import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 상태읽기 } from './helpers/game-state.helper.js';
import { 체력숫자 } from './helpers/economy.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-150',
  name: '탱커 체력이 1 일 때 물약을 쓰면 기본 체력 절반 600 을 회복해 601 이 된다',
  platforms: ['android'],
  precondition: ['일반 회원이 탱커로 던전에 들어와 있다'],
  elements: ['item:health_potion'],
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
      await verify('던전에 행동 막대가 보인다', await 던전화면.지금(game).보이나(던전화면.행동막대), true, { blocker: true });
    });
    await test.step('체력을 1 로 바꾸고 「물약」을 누른다', async () => {
      await GM(game, '/gm hp 1');
      await 던전화면.지금(game).물약누르기();
      await game.waitFor(던전화면.물약글, { text: '물약 2', timeoutMs: 10_000 }).catch(() => undefined);
      const 상태 = await 상태읽기(game, true);
      await verify('탱커 체력이 1 일 때 물약을 쓰면 기본 체력 절반 600 을 회복해 601 이 된다', 체력숫자(상태), 601);
    });
    await test.step('체력을 1000 으로 바꾸고 「물약」을 누른다', async () => {
      await GM(game, '/gm hp 1000');
      await 던전화면.지금(game).물약누르기();
      await game.waitFor(던전화면.물약글, { text: '물약 1', timeoutMs: 10_000 }).catch(() => undefined);
      const 상태 = await 상태읽기(game, true);
      await verify('체력이 1000 일 때 물약을 써도 기본 체력 1200 을 넘지 않는다', 체력숫자(상태) <= 1200, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
