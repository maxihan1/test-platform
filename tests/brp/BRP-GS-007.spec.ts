import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { type 로그줄, 설명안되는줄, 처치줄 } from './helpers/game-log.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 내로그, 던전을비우고레벨맞추기, 봇과파티맺기, 봇쓰러뜨리기, 알려진줄, 임프몇초치기, 켠봇과던전들어가기 } from './helpers/mission.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-GS-007',
  name: '처치 줄 경험치: 전부 반올림(12 × 1 × 1.1) = 13 (최소 3줄)',
  platforms: ['windows'],
  precondition: ['탱커 · 레벨 1 · 장비 없음 · 파티 2명 · 던전 인원 2(봇은 쓰러져 있음)'],
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
  const 둘 = { 아이디: params.p2Id ?? '', 비밀번호: params.p2Password ?? '' };
  await test.cleanup('방을 로비로 돌리고 계정을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘.아이디, 둘.비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('탱커 · 레벨 1 로 두 번째 플레이어와 파티를 맺고 던전에 들어와 봇을 쓰러뜨린 것을 확인한다', async () => {
    const 봇이름들 = [await 봇과파티맺기(admin, game, 둘, 아이디)];
    await 켠봇과던전들어가기(admin, game, 봇이름들, '탱커');
    await 던전을비우고레벨맞추기(game, 1);
    await 봇쓰러뜨리기(admin, 봇이름들);
    await verify('/gm stat 레벨이 1 이다', 스탯숫자(await GM스탯(game), '레벨'), 1, { blocker: true });
  });

  const 던전 = await 던전화면.열림(game);
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step('불러낸 임프를 「전투 망치」로 하나씩 3마리 처치', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 임프몇초치기(game, 던전, '공격'), {
        progress: async () => 처치줄((줄들 = await 로그.lines()), 아이디).length,
        goal: 3,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    await verify.log('BRP-REQ-284 처치 줄 경험치: 전부 반올림(12 × 1 × 1.1) = 13 (최소 3줄)', 처치줄(줄들, 아이디).map((줄) => 줄.exp), Math.round(12 * 1 * 1.1), { least: 3 });
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(2))) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
