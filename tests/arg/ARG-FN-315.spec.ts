import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임프하나만두기 } from './helpers/battle.helper.js';

import { 내가봇을파티에초대해수락시키기 } from './helpers/social.helper.js';
import { 던전으로, 로비로 } from './helpers/game-enter.helper.js';
import { GM, 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 상태읽기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-315',
  name: '2명 파티로 임프를 처치하면 경험치가 12 × 1.1 을 반올림한 13 오른다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 같은 파티로 던전에 있고 임프 하나를 불러냈다'],
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
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  try {
    await test.step('일반 회원과 두 번째 플레이어 봇이 파티로 던전에 들어가 임프 하나를 불러낸다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 로비로(game, 아이디, 비밀번호);
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 내가봇을파티에초대해수락시키기(game, admin, 둘째);
      await 봇시키기(admin, 둘째, 'seat:2');
      await 봇시키기(admin, 둘째, 'ready');
      await 던전으로(game, 아이디, 비밀번호, 0);
      await 임프하나만두기(game);
    });
    await test.step('던전에 임프가 있는지 확인한다', async () => {
      await verify('던전에 임프가 보인다', await 던전화면.지금(game).보이나(던전화면.임프), true, { blocker: true });
    });
    await test.step('GM 명령으로 임프를 처치하고 경험치를 읽는다', async () => {
      const 앞 = Number((await 상태읽기(game, true))['경험치']);
      await GM(game, '/gm killall');
      await game.waitFor(던전화면.임프, { gone: true, timeoutMs: 10_000 });
      const 뒤 = Number((await 상태읽기(game, true))['경험치']);
      await verify('2명 파티로 임프를 처치하면 경험치가 12 × 1.1 을 반올림한 13 오른다', 뒤 - 앞, 13);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
