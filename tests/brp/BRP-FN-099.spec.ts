import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과함께던전입장 } from './helpers/dungeon.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, 스탯숫자, GM임프불러내기, GM체력 } from './helpers/gm.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-099',
  name: '체력이 0 이 되면 죽지 않고 쓰러져 /gm stat 체력이 0 으로 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 두 번째 플레이어 봇과 함께 던전에 들어와 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 봇아이디 = params.p2Id ?? '';
  const 봇비밀번호 = params.p2Password ?? '';
  await test.cleanup('방을 로비로 돌리고 두 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 봇아이디, 봇비밀번호, 'base');
  });

  await test.step('일반 회원이 탱커로 두 번째 플레이어 봇과 함께 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 봇과함께던전입장(admin, game, 봇아이디, 봇비밀번호, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });
  await test.step('/gm hp 10 으로 체력을 줄이고 임프를 불러 맞는다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 채팅창.열기(game);
    await GM체력(game, 10);
    await GM임프불러내기(game);
    await verify('쓰러졌다는 알림이 알림 줄에 보인다', await 던전.알림줄기다리기('님이 쓰러졌습니다!', 30_000), true, { blocker: true });
    const 값 = await GM스탯(game);
    await verify('체력이 0 이 되면 죽지 않고 쓰러져 /gm stat 체력이 0 으로 보인다', 스탯숫자(값, '체력'), 0);
  });
});
