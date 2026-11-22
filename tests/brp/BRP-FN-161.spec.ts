import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 레벨업글금색인가 } from './helpers/dungeon.helper.js';
import { 갈래B큰글읽기 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM보스처치, GM보스방가기 } from './helpers/gm.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-161',
  name: '보스를 잡으면 화면 가운데에 큰 금색 글씨 「보스 처치!」가 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 보스 방에 있다'],
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
  await test.step('일반 회원이 탱커로 혼자 보스 방에 있는 것을 확인한다', async () => {
    await GM보스방가기(game);
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });
  await test.step('/gm killboss 로 보스를 잡는다', async () => {
    await 채팅창.열기(game);
    await GM보스처치(game);
    const 큰글 = await 갈래B큰글읽기(game, 던전화면.큰글);
    const 글 = await verify('큰 글씨 「보스 처치!」가 뜬다', 큰글 !== null && 큰글.글.includes('보스 처치!'), true);
    const 가로 = await verify('큰 글씨가 화면 가로 가운데에 있다', 큰글 !== null && Math.abs(큰글.자리.가로 - 0.5) < 0.1, true);
    const 세로 = await verify('큰 글씨가 화면 세로 가운데에 있다', 큰글 !== null && Math.abs(큰글.자리.세로 - 0.5) < 0.2, true);
    const 금색 = await verify('큰 글씨가 금색이다', 큰글 !== null && 레벨업글금색인가(큰글.색), true);
    await verify('보스를 잡으면 화면 가운데에 큰 금색 글씨 「보스 처치!」가 뜬다', 글 && 가로 && 세로 && 금색, true);
  });
});
