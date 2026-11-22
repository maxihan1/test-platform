import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 불러둔임프잡기, 임프하나두기 } from './helpers/dungeon.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기, 캐릭터값기다리기, 캐릭터읽기 } from './helpers/game-state.helper.js';
import { GM전리품 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-584',
  name: '임프 전리품을 「체력 물약」으로 고정하고 임프를 잡으면 가방 체력 물약이 하나 늘어난다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 적을 모두 치우고 임프 하나를 불러 두었다'],
  techniques: ['결정 테이블'],
  elements: ['drop:임프', 'item:체력 물약'],
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
    처음 = (await 캐릭터읽기(admin, 아이디)).items['체력 물약'] ?? 0;
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('적을 모두 치우고 임프 하나를 불러 둔 것을 확인한다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM전리품(game, 'none');
    await 임프하나두기(game);
    await verify('불러낸 임프가 하나 있다', await 던전.임프있나(), true, { blocker: true });
  });

  await test.step('/gm loot 체력 물약 으로 전리품을 고정하고 불러낸 임프를 잡는다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM전리품(game, '체력 물약');
    const 잡았다 = await 불러둔임프잡기(던전);
    await GM전리품(game, 'off');
    await verify('불러낸 임프가 사라졌다', 잡았다, true);
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => (c.items['체력 물약'] ?? 0) - 처음 >= 1, 25_000);
    await verify('임프 전리품을 「체력 물약」으로 고정하고 임프를 잡으면 가방 체력 물약이 하나 늘어난다', (값.items['체력 물약'] ?? 0) - 처음, 1);
  });
});
