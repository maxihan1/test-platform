import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기, 캐릭터값기다리기, 캐릭터읽기 } from './helpers/game-state.helper.js';
import { GM보스방가기, GM보스처치, GM전리품 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-586',
  name: '보스 전리품이 「보스의 왕관 조각」 100% 일 때 보스를 잡으면 가방에 「보스의 왕관 조각」이 하나 생긴다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 보스 방에 있다'],
  techniques: ['경계값 분석'],
  elements: ['drop:보스 임프', 'item:보스의 왕관 조각'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  let 처음 = 0;
  await test.step('일반 회원이 탱커로 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    처음 = (await 캐릭터읽기(admin, 아이디)).items['보스의 왕관 조각'] ?? 0;
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 탱커로 혼자 보스 방에 있는 것을 확인한다', async () => {
    await GM보스방가기(game);
    await 던전화면.열림(game);
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('/gm loot 보스의 왕관 조각 으로 고정하고 /gm killboss 로 보스를 잡는다', async () => {
    await GM전리품(game, '보스의 왕관 조각');
    await GM보스처치(game);
    await GM전리품(game, 'off');
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => (c.items['보스의 왕관 조각'] ?? 0) - 처음 >= 1, 25_000);
    await verify('보스 전리품이 「보스의 왕관 조각」 100% 일 때 보스를 잡으면 가방에 「보스의 왕관 조각」이 하나 생긴다', (값.items['보스의 왕관 조각'] ?? 0) - 처음, 1);
  });
});
