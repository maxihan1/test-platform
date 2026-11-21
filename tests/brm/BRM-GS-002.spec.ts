import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서끼기, 사기 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { type 로그줄, 미션로그, 반올림, 설명안되는줄, 임프있게하기, 적치우고레벨맞추기, 준피해, 처치줄 } from './helpers/mission-log.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-002',
  name: '레벨 5 탱커가 「강철 롱소드」를 끼고 임프 2마리를 잡는 동안 준 피해가 기획서 공식 값이다',
  platforms: ['android'],
  precondition: ['탱커 · 레벨 5 · 「강철 롱소드」 · 혼자 던전'],
  elements: ['monster:임프', 'skill:전투 망치', 'item:강철 롱소드', 'state:레벨=5', 'state:무기=강철 롱소드', 'state:직업=탱커'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('로비에서 「강철 롱소드」를 사서 끼고 탱커로 혼자 던전에 들어가 레벨 5 로 맞춘다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 5000);
    await 사기(game, '강철 롱소드');
    await verify('「강철 롱소드」를 무기 칸에 낀다', await 가방에서끼기(game, '강철 롱소드', '무기'), true, { blocker: true });
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 적치우고레벨맞추기(game, 5);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('「전투 망치」로 임프 2마리를 잡는다', async () => {
    const 던전 = await 던전화면.열기(game);
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(
        async () => {
          await 임프있게하기(game);
          await 던전.첫임프치기();
        },
        {
          progress: async () => 처치줄((줄들 = await 로그.lines()), 나.아이디, 'Imp').length,
          goal: 2,
          stallMs: 60_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 값들 = 준피해(줄들, 나.아이디, '전투 망치').map((줄) => 줄.value);
    const 공식값 = 반올림((10 * (100 + 3 * (5 - 1) + 12)) / 100);
    const 예값 = await verify.log('「전투 망치」로 준 피해 줄이 전부 12 다', 값들, 12);
    const 공식 = await verify.log('「전투 망치」로 준 피해 줄이 전부 반올림(10 × 1.24) 이다', 값들, 공식값);
    await verify('BRM-REQ-375 레벨 5 탱커가 「강철 롱소드」를 끼고 「전투 망치」로 준 피해는 12 다', 예값, true);
    await verify('BRM-REQ-104 준 피해는 반올림(기본 피해 10 × 공격 배율 1.24) = 12 다', 공식, true);
    const 조건 = { 레벨: 5, 직업: '탱커', 무기: '강철 롱소드', 갑옷: '-', 인원: 1 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit', 'kill', 'item']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
