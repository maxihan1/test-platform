import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { type 로그줄, 설명안되는줄, 회복줄 } from './helpers/game-log.helper.js';
import { 계정되돌리기, 로비로되돌리기, 봇시키기 } from './helpers/game-state.helper.js';
import { GM스탯, 스탯숫자 } from './helpers/gm.helper.js';
import { 내로그, 던전을비우고레벨맞추기, 동료치유하기, 봇과던전들어가기, 알려진줄 } from './helpers/mission.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-GS-012',
  name: '회복 줄(치유의 손길): 전부 배율 · 방어율 없이 250 (최소 1줄)',
  platforms: ['windows'],
  precondition: ['마법사 · 레벨 5 · 장비 없음 · 던전 인원 2(동료 봇 탱커 체력 100)'],
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

  await test.step('마법사 · 레벨 5 로 동료 봇 탱커와 던전에 들어와 봇 체력을 100 으로 줄인 것을 확인한다', async () => {
    const { 봇이름들 } = await 봇과던전들어가기(admin, game, [둘], '마법사', [0]);
    await 던전을비우고레벨맞추기(game, 5);
    for (const 봇 of 봇이름들) await 봇시키기(admin, 봇, 'gm:hp 100');
    await verify('/gm stat 레벨이 5 이다', 스탯숫자(await GM스탯(game), '레벨'), 5, { blocker: true });
  });

  const 던전 = await 던전화면.열림(game);
  const 로그 = await gameLog(내로그(admin, 아이디));
  await test.step('동료 초상화를 고른 뒤 「치유의 손길」 쓰기', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 동료치유하기(game, 던전), {
        progress: async () => 회복줄((줄들 = await 로그.lines()), 아이디).length,
        goal: 1,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    await verify.log('BRP-REQ-102 회복 줄(치유의 손길): 전부 배율 · 방어율 없이 250 (최소 1줄)', 회복줄(줄들, 아이디).filter((줄) => 줄.skill === '치유의 손길').map((줄) => 줄.value), 250);
    for (const 줄 of 설명안되는줄(줄들, 알려진줄(2))) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
