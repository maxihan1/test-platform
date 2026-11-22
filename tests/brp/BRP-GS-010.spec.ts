import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { type 로그줄, 설명안되는줄, 아이템줄, 처치줄 } from './helpers/game-log.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM보스방가기, GM보스처치, GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 내로그, 던전을비우고레벨맞추기, 알려진줄, 장비갖추기 } from './helpers/mission.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-GS-010',
  name: '레벨 1 탱커가 혼자 보스 임프를 잡는 동안 보스 처치 경험치 · 골드 · 아이템 줄 수가 기획서 값이다',
  platforms: ['windows'],
  precondition: ['탱커 · 레벨 1 · 장비 없음 · 파티 없음 · 혼자 · 보스 방'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('탱커 · 레벨 1 로 혼자 던전에 들어온 것을 확인한다', async () => {
    await 장비갖추기(game, 1, null);
    await 던전입장(game, '탱커');
    await 던전을비우고레벨맞추기(game, 1);
    await verify('/gm stat 레벨이 1 이다', 스탯숫자(await GM스탯(game), '레벨'), 1, { blocker: true });
  });

  await 던전화면.열림(game);
  await GM보스방가기(game);
  let 보스처치함 = false;
  const 보스한번잡기 = async (): Promise<void> => {
    if (보스처치함) return;
    보스처치함 = true;
    await GM보스처치(game);
  };
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step('보스 방에서 보스 임프 처치', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 보스한번잡기(), {
        progress: async () => 처치줄((줄들 = await 로그.lines()), 아이디, 'ImpBoss').length,
        goal: 1,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    await verify.log('BRP-REQ-124 보스 처치 줄 경험치: 반올림(300 × 1 × 1) = 300 (최소 1줄)', 처치줄(줄들, 아이디, 'ImpBoss').map((줄) => 줄.exp), Math.round(300 * 1 * 1));
    await verify.log('BRP-REQ-131 보스 처치 줄 골드: 반올림(200 × 1) = 200 (최소 1줄)', 처치줄(줄들, 아이디, 'ImpBoss').map((줄) => 줄.gold), Math.round(200 * 1));
    await verify.log('BRP-REQ-132 보스 처치 한 번의 아이템 줄 수: 1 (최소 1줄)', 처치줄(줄들, 아이디, 'ImpBoss').length === 0 ? [] : [아이템줄(줄들, 아이디).length], 1);
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(1))) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
