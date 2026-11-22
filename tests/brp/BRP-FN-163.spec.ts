import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 갈래B임프수 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, 스탯숫자, GM모두처치, GM보스처치, GM보스방가기 } from './helpers/gm.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-163',
  name: '임프를 잡으면 /gm stat 처치 수가 잡은 수만큼 늘고 보스 처치 수는 그대로다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다', '일반 회원이 탱커로 혼자 보스 방에 있다'],
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

  await test.step('일반 회원이 탱커로 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });
  await test.step('/gm stat 으로 처치 수를 읽고 /gm killall 로 적을 모두 처치한 뒤 다시 읽는다', async () => {
    const 임프수 = await 갈래B임프수(game);
    await verify('던전에 임프가 있다', 임프수 > 0, true, { blocker: true });
    const 전 = await GM스탯(game);
    await GM모두처치(game);
    const 후 = await GM스탯(game);
    const 처치 = await verify('처치 수가 잡은 수만큼 늘었다', 스탯숫자(후, '처치') - 스탯숫자(전, '처치'), 임프수);
    const 보스 = await verify('보스 처치 수가 그대로다', 스탯숫자(후, '보스처치'), 스탯숫자(전, '보스처치'));
    await verify('임프를 잡으면 /gm stat 처치 수가 잡은 수만큼 늘고 보스 처치 수는 그대로다', 처치 && 보스, true);
  });
  await test.step('/gm killboss 로 보스를 잡고 /gm stat 을 읽는다', async () => {
    await 채팅창.열기(game);
    await GM보스방가기(game);
    const 전 = await GM스탯(game);
    await GM보스처치(game);
    const 후 = await GM스탯(game);
    await verify('보스를 잡은 뒤 /gm stat 보스 처치 수가 1 늘어난다', 스탯숫자(후, '보스처치') - 스탯숫자(전, '보스처치'), 1);
  });
});
