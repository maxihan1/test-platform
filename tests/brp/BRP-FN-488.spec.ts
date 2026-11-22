import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-488',
  name: '던전에 들어가면 왼쪽 위 초상화와 행동 막대가 있는 던전 HUD 가 보인다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('자리를 고르고 「준비!」를 눌러 던전에 들어간다', async () => {
    await (await 로비화면.열림(game)).던전들어가기(로비화면.직업자리['탱커']);
    const 던전 = await 던전화면.안내창뜸(game);
    await 던전.안내창닫기();
    const 자리 = await 화면자리읽기(game, 던전화면.내이름);
    const 왼쪽 = await verify('초상화가 화면 왼쪽에 있다', 자리.가로 < 0.5, true);
    const 위쪽 = await verify('초상화가 화면 위쪽에 있다', 자리.세로 < 0.5, true);
    const 막대 = await verify('행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true);
    await verify('던전에 들어가면 왼쪽 위 초상화와 행동 막대가 있는 던전 HUD 가 보인다', 왼쪽 && 위쪽 && 막대, true);
  });
});
