import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { type 로그줄, 설명안되는줄, 준피해, 처치줄 } from './helpers/game-log.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 내로그, 던전을비우고레벨맞추기, 알려진줄, 임프몇초치기, 장비갖추기 } from './helpers/mission.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-GS-003',
  name: '준 피해 줄(질주 공격): 전부 44 (최소 1줄)',
  platforms: ['windows'],
  precondition: ['도적 · 레벨 10 · 룬 새김 도끼 · 파티 없음 · 혼자'],
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

  await test.step('도적 · 레벨 10 · 룬 새김 도끼로 혼자 던전에 들어온 것을 확인한다', async () => {
    await 장비갖추기(game, 10, '룬 새김 도끼');
    await 던전입장(game, '도적');
    await 던전을비우고레벨맞추기(game, 10);
    await verify('/gm stat 레벨이 10 이다', 스탯숫자(await GM스탯(game), '레벨'), 10, { blocker: true });
  });

  const 던전 = await 던전화면.열림(game);
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step('불러낸 임프를 고른 뒤 「질주 공격」으로 하나씩 3마리 처치', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 임프몇초치기(game, 던전, '스킬1'), {
        progress: async () => 처치줄((줄들 = await 로그.lines()), 아이디).length,
        goal: 3,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    await verify.log('BRP-REQ-376 준 피해 줄(질주 공격): 전부 44 (최소 1줄)', 준피해(줄들, 아이디, '질주 공격').map((줄) => 줄.value), 44);
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(1))) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
