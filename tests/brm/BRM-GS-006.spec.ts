import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서끼기, 함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 레벨맞추기, 보스방가기, 봇모두끄기, 적모두처치, 전리품고정, 전리품원래대로 } from './helpers/game-state.helper.js';
import { type 로그줄, 맞을때까지기다리기, 미션로그, 받은피해, 설명안되는줄, 임프있게하기 } from './helpers/mission-log.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-006',
  name: 'BRM-REQ-379 레벨 30 「용비늘 갑옷」으로 보스에게 맞은 피해는 14 다',
  platforms: ['android'],
  precondition: ['탱커 · 레벨 30 · 「용비늘 갑옷」 · 던전 3명(두 번째 · 세 번째 플레이어 봇)'],
  elements: ['monster:보스 임프', 'item:용비늘 갑옷', 'state:레벨=30', 'state:갑옷=용비늘 갑옷', 'state:던전 인원=3', 'state:직업=탱커'],
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
  await test.step('두 번째 · 세 번째 플레이어 봇과 3명이 던전에 들어가 「용비늘 갑옷」을 얻어 끼고 레벨 30 으로 보스 방에 간다', async () => {
    await 함께던전으로(game, driver, admin, 나, [{ 계정: 두번째, 자리: 2 }, { 계정: 세번째, 자리: 4 }], 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 임프있게하기(game);
    await 전리품고정(game, '용비늘 갑옷');
    await 적모두처치(game);
    await new 던전화면(game).임프다사라질때까지(30_000);
    await 전리품원래대로(game);
    await verify('「용비늘 갑옷」을 갑옷 칸에 낀다', await 가방에서끼기(game, '용비늘 갑옷', '갑옷'), true, { blocker: true });
    await 레벨맞추기(game, 30);
    await 보스방가기(game);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('보스 방에서 보스 임프에게 3번 맞는다', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          await 맞을때까지기다리기(game, 10_000);
        },
        {
          progress: async () => 받은피해((줄들 = await 로그.lines()), 나.아이디, 'ImpBoss').length,
          goal: 3,
          stallMs: 90_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 피해 = await verify.log('보스가 나를 친 피해 줄이 전부 14 다', 받은피해(줄들, 나.아이디, 'ImpBoss').map((줄) => 줄.value), 14, { least: 3 });
    await verify('BRM-REQ-379 레벨 30 「용비늘 갑옷」으로 보스에게 맞은 피해는 14 다', 피해, true);
    const 조건 = { 레벨: 30, 직업: '탱커', 무기: '-', 갑옷: '용비늘 갑옷', 인원: 3 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
