import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임프하나잡기 } from './helpers/dungeon.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM레벨, GM모두처치, GM스탯, GM전리품, 스탯숫자 } from './helpers/gm.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-468',
  name: '/gm stat 으로 방어율을 읽으면 방어율이 가장 높은 레벨 30 · 「용비늘 갑옷」에서도 방어율이 상한 0.6 을 넘지 않는다',
  platforms: ['windows'],
  precondition: ['일반 회원이 레벨 30 으로 「용비늘 갑옷」을 장착하고 로비에 있다'],
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

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('레벨 30 으로 「용비늘 갑옷」을 장착한다', async () => {
    const 던전 = await 던전입장(game, '탱커');
    await GM모두처치(game);
    await GM전리품(game, '용비늘 갑옷');
    const 잡음 = await 임프하나잡기(game, 던전);
    await GM전리품(game, 'off');
    await verify('임프를 잡아 전리품을 얻었다', 잡음, true, { blocker: true });
    await GM레벨(game, 30);
    const 가방 = await 가방창.열기(game);
    await 가방.줄이생길때까지('용비늘 갑옷');
    await 가방.장착하기('용비늘 갑옷');
    await verify('갑옷 칸에 「용비늘 갑옷」이 보인다', await 가방.칸이될때까지('갑옷', '용비늘 갑옷'), true, { blocker: true });
    await 가방.닫기();
  });

  await test.step('/gm stat 으로 방어율을 읽는다', async () => {
    const 값 = await GM스탯(game);
    await verify('/gm stat 으로 방어율을 읽으면 방어율이 가장 높은 레벨 30 · 「용비늘 갑옷」에서도 방어율이 상한 0.6 을 넘지 않는다', 스탯숫자(값, '방어율') <= 0.6, true);
  });
});
