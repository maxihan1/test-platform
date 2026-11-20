import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임프하나만두기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 보스방가기, 보스처치, 봇모두끄기, 적모두처치 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-169',
  name: '임프와 보스를 잡으면 「/gm stat」 처치와 보스처치가 따로 1씩 는다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['monster:임프', 'monster:보스 임프', 'zone:BossArena'],
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
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('임프 하나와 보스를 처치한 뒤 「/gm stat」 둘째 줄을 읽는다', async () => {
    await 임프하나만두기(game);
    const 전 = await GM상태(game);
    await 적모두처치(game);
    await 보스방가기(game);
    await 보스처치(game);
    const 후 = await GM상태(game);
    const 처치 = await verify('「/gm stat」 처치가 1 는다', Number(후['처치']) - Number(전['처치']), 1);
    const 보스 = await verify('「/gm stat」 보스처치가 1 는다', Number(후['보스처치']) - Number(전['보스처치']), 1);
    await verify('임프와 보스를 잡으면 「/gm stat」 처치와 보스처치가 따로 1씩 는다', 처치 && 보스, true);
  });
});
