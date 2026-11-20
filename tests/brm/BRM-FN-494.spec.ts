import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-494',
  name: '던전에 들어가면 던전 HUD 의 초상화와 행동 막대가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['zone:DungeonStart'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('첫 자리를 고르고 「준비!」를 누른 뒤 조작 안내 창을 닫는다', async () => {
    await 던전으로(game, driver, 나, 0);
    const 던전 = await 던전화면.열기(game);
    const 초상화 = await verify('던전 HUD 의 초상화가 보인다', await 던전.보임(던전화면.내초상화), true);
    const 행동막대 = await verify('던전 HUD 의 행동 막대가 보인다', await 던전.보임(던전화면.행동막대), true);
    await verify('던전에 들어가면 던전 HUD 의 초상화와 행동 막대가 보인다', 초상화 && 행동막대, true);
    const 배치 = await game.layout(던전화면.판);
    await verify('던전 HUD 의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
  });
});
