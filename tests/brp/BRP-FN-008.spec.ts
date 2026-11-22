import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-008',
  name: '/gm level 10 으로 레벨을 바꾸고 /gm stat 으로 체력을 읽으면 레벨을 1 에서 10 으로 올려도 탱커 기본 체력이 1,200 그대로다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다', '일반 회원으로 로그인해 로비에 있다'],
  elements: ['class:탱커', 'level:10'],
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

  await test.step('일반 회원이 탱커로 혼자 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('/gm level 10 으로 레벨을 바꾸고 /gm stat 으로 체력을 읽는다', async () => {
    await GM레벨(game, 10);
    const 값 = await GM스탯(game);
    await verify('/gm stat 레벨이 10 이다', 스탯숫자(값, '레벨'), 10, { blocker: true });
    await verify('/gm level 10 으로 레벨을 바꾸고 /gm stat 으로 체력을 읽으면 레벨을 1 에서 10 으로 올려도 탱커 기본 체력이 1,200 그대로다', 스탯숫자(값, '체력'), 1200);
  });

  await test.step('/gm level 10 으로 레벨을 바꾸고 /gm stat 으로 공격 배율 · 방어율을 읽는다', async () => {
    await GM레벨(game, 10);
    const 값 = await GM스탯(game);
    const 공격 = await verify('공격 배율이 1.27 이다', 스탯숫자(값, '공격배율'), 1.27);
    const 방어 = await verify('방어율이 0.09 이다', 스탯숫자(값, '방어율'), 0.09);
    await verify('레벨을 10 으로 올린 뒤 공격 배율이 1.27 · 방어율이 0.09 로 바뀐다', 공격 && 방어, true);
  });
});
