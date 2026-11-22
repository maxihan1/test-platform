import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임프하나잡기 } from './helpers/dungeon.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기, 캐릭터값기다리기, 캐릭터읽기 } from './helpers/game-state.helper.js';
import { GM모두처치, GM전리품 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-583',
  name: '임프 전리품이 「체력 물약」 100% 일 때 임프 다섯 마리를 잡으면 체력 물약이 다섯 개 늘어난다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다'],
  techniques: ['경계값 분석'],
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

  await test.step('던전의 적을 모두 치우고 전리품이 나오지 않게 한 것을 확인한다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM전리품(game, 'none');
    await GM모두처치(game);
    await verify('던전에 임프가 없다', await 던전.임프사라질때까지(), true, { blocker: true });
  });

  await test.step('/gm loot 체력 물약 으로 고정하고 임프를 다섯 번 불러 잡는다', async () => {
    const 던전 = await 던전화면.열림(game);
    await GM전리품(game, '체력 물약');
    let 잡은수 = 0;
    for (let 번 = 0; 번 < 5; 번 += 1) {
      if (await 임프하나잡기(game, 던전)) 잡은수 += 1;
    }
    await GM전리품(game, 'off');
    await verify('임프 다섯 마리를 잡았다', 잡은수, 5);
    const 값 = await 캐릭터값기다리기(admin, 아이디, (c) => (c.items['체력 물약'] ?? 0) - 처음 >= 5, 25_000);
    await verify('임프 전리품이 「체력 물약」 100% 일 때 임프 다섯 마리를 잡으면 체력 물약이 다섯 개 늘어난다', (값.items['체력 물약'] ?? 0) - 처음, 5);
  });
});
