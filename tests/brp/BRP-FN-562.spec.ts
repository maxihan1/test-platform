import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 화면자리읽기 } from './helpers/dungeon.helper.js';
import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-562',
  name: '던전 상단 바 자리와 크기를 읽으면 던전 상단 바는 화면 가운데 위에 있고 로비 상단 바보다 작다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  let 로비너비 = 0;
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('로비 상단 바 크기를 읽어 둔다', async () => {
    로비너비 = (await 화면자리읽기(game, 공통HUD.상단바)).너비;
    await verify('로비 상단 바 너비를 읽었다', 로비너비 > 0, true, { blocker: true });
  });

  await test.step('일반 회원이 탱커로 혼자 던전에 들어온 것을 확인한다', async () => {
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });

  await test.step('던전 상단 바 자리와 크기를 읽는다', async () => {
    const 자리 = await 화면자리읽기(game, 공통HUD.상단바);
    const 가운데 = await verify('던전 상단 바가 화면 가로 가운데에 있다', Math.abs(자리.가로 - 0.5) < 0.1, true);
    const 위쪽 = await verify('던전 상단 바가 화면 위쪽에 있다', 자리.세로 < 0.5, true);
    const 작다 = await verify('던전 상단 바가 로비 상단 바보다 작다', 자리.너비 < 로비너비, true);
    await verify('던전 상단 바 자리와 크기를 읽으면 던전 상단 바는 화면 가운데 위에 있고 로비 상단 바보다 작다', 가운데 && 위쪽 && 작다, true);
  });
});
