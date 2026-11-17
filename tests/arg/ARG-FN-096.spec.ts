import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-096',
  name: '던전이 진행 중일 때 들어오면 로비를 거치지 않고 던전 HUD 가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 혼자 준비해 던전이 진행 중이다'],
  elements: ['zone:Dungeon', 'state:장소=던전'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째 = { 아이디: params.secondId ?? '', 비밀번호: params.secondPassword ?? '' };
  try {
    await test.step('두 계정을 처음 상태로 되돌리고 봇이 혼자 준비해 던전을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 계정되돌리기(admin, 둘째.아이디, 둘째.비밀번호, 'base');
      const 봇 = await 봇켜기(admin, { user: 둘째.아이디, pass: 둘째.비밀번호 });
      await 봇시키기(admin, 봇, 'seat:2');
      await 봇시키기(admin, 봇, 'ready');
    });

    await test.step('일반 회원으로 로그인한다', async () => {
      await 로그인하기(game, 아이디, 비밀번호);
      const 던전HUD = await game.waitFor(던전화면.행동막대, { timeoutMs: 30_000 }).then(
        () => true,
        () => false,
      );
      await verify('던전이 진행 중일 때 들어오면 로비를 거치지 않고 던전 HUD 가 보인다', 던전HUD, true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째.아이디, 둘째.비밀번호, 'base');
  }
});
