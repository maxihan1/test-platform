import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 갈래B뜰때까지, 갈래B봇먼저던전열기 } from './helpers/dungeon-wait.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-111',
  name: '던전이 진행 중일 때 들어오면 로비를 거치지 않고 바로 던전에 들어간다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 봇이 혼자 준비해 던전을 진행하고 있다'],
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

  await test.step('두 번째 플레이어 봇이 혼자 준비해 던전을 진행하고 있는 것을 확인한다', async () => {
    await verify('던전이 열린다', await 갈래B봇먼저던전열기(admin, 봇아이디, 봇비밀번호), true, { blocker: true });
  });
  await test.step('일반 회원으로 로그인한다', async () => {
    const 화면 = await 로그인화면.열림(game);
    const 안내 = new 안내창(game);
    if (await 안내.보이나()) await 안내.확인누르기();
    await 화면.넣고시작(아이디, 비밀번호);
    const 던전 = await verify('던전 행동 막대가 보인다', await 갈래B뜰때까지(game, 던전화면.행동막대, 60_000), true);
    const 로비아님 = await verify('로비 화면이 보이지 않는다', (await game.find(로비화면.준비버튼)) === null, true);
    await verify('던전이 진행 중일 때 들어오면 로비를 거치지 않고 바로 던전에 들어간다', 던전 && 로비아님, true);
  });
});
