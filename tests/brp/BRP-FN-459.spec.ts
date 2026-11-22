import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-459',
  name: '/gm stat 으로 행동 버튼 스킬 이름을 읽으면 탱커 행동 버튼 스킬에 「돌진」이 없다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 있다'],
  elements: ['skill:돌진'],
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

  await test.step('/gm stat 으로 행동 버튼 스킬 이름을 읽는다', async () => {
    const 값 = await GM스탯(game);
    await verify('/gm stat 직업이 탱커다', 값['직업'], '탱커', { blocker: true });
    await verify('/gm stat 으로 행동 버튼 스킬 이름을 읽으면 탱커 행동 버튼 스킬에 「돌진」이 없다', (값['스킬'] ?? '').includes('돌진'), false);
  });
});
