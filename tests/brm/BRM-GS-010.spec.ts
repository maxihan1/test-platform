import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { type 로그줄, 미션로그, 반올림, 설명안되는줄, 임프있게하기, 적치우고레벨맞추기, 준피해, 처치줄, 회복뜰때까지기다리기, 회복줄 } from './helpers/mission-log.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-010',
  name: '레벨 11 마법사가 장비 없이 3명 던전에서 동료를 회복하고 임프를 치는 동안 회복량과 준 피해가 기획서 값이다',
  platforms: ['android'],
  precondition: ['마법사 · 레벨 11 · 장비 없음 · 던전 3명(두 번째 · 세 번째 플레이어 봇)'],
  elements: ['monster:임프', 'skill:치유의 손길', 'skill:마력탄', 'state:직업=마법사', 'state:던전 인원=3'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 세번째 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 · 세 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
    await 계정되돌리기(admin, 세번째);
  });
  let 봇들: string[] = [];
  await test.step('마법사로 두 번째 · 세 번째 플레이어 봇과 3명이 던전에 들어가 적을 치우고 레벨 11 로 맞춘다', async () => {
    봇들 = await 함께던전으로(game, driver, admin, 나, [{ 계정: 두번째, 자리: 0 }, { 계정: 세번째, 자리: 2 }], 4);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 적치우고레벨맞추기(game, 11);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('동료 체력을 100 으로 내린 뒤 「치유의 손길」로 회복하고 「마력탄」으로 임프 1마리를 잡는다', async () => {
    const 던전 = await 던전화면.열기(game);
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          for (const 봇 of 봇들) await 봇시키기(admin, 봇, 'gm:hp 100');
          await 던전.동료치유(1);
          await 회복뜰때까지기다리기(game);
        },
        {
          progress: async () => 회복줄((줄들 = await 로그.lines()), 나.아이디, '치유의 손길').length,
          goal: 1,
          stallMs: 60_000,
        },
      );
      await repeatUntil(
        async () => {
          await 임프있게하기(game);
          await 던전.첫임프치기();
        },
        {
          progress: async () => 처치줄((줄들 = await 로그.lines()), 나.아이디, 'Imp').length,
          goal: 1,
          stallMs: 60_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 마력탄값 = 반올림((5 * (100 + 3 * (11 - 1))) / 100);
    const 회복 = await verify.log('「치유의 손길」 회복 줄이 전부 250 이다', 회복줄(줄들, 나.아이디, '치유의 손길').map((줄) => 줄.value), 250);
    const 피해 = await verify.log('「마력탄」으로 준 피해 줄이 전부 6 이다', 준피해(줄들, 나.아이디, '마력탄').map((줄) => 줄.value), 마력탄값);
    await verify('BRM-REQ-102 레벨 11 마법사의 「치유의 손길」 회복은 보정 없이 250 이다', 회복, true);
    await verify('BRM-REQ-108 레벨 11 마법사가 「마력탄」으로 준 피해는 5 × 1.30 = 6.5 를 가까운 짝수로 반올림한 6 이다', 피해, true);
    const 조건 = { 레벨: 11, 직업: '마법사', 무기: '-', 갑옷: '-', 인원: 3 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit', 'heal', 'kill', 'item']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
