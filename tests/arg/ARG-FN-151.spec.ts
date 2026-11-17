import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-151',
  name: '던전에서 살아 있을 때 「물약」을 누르면 「체력 물약 사용」 알림이 뜬다',
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
    await test.step('「물약」 버튼을 누른다', async () => {
      const 던전 = 던전화면.지금(game);
      const 전 = Number((await 던전.물약글읽기()).replace(/[^0-9]/g, ''));
      await 던전.물약누르기();
      const 떴다 = await 던전.hud.알림기다리기('체력 물약 사용');
      await verify('던전에서 살아 있을 때 「물약」을 누르면 「체력 물약 사용」 알림이 뜬다', 떴다, true);
      await game.waitFor(던전화면.물약글, { text: '물약 ' + String(전 - 1), timeoutMs: 10_000 }).catch(() => undefined);
      const 후 = Number((await 던전.물약글읽기()).replace(/[^0-9]/g, ''));
      await verify('「물약」 버튼의 개수가 1 줄어든다', 전 - 후, 1);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
