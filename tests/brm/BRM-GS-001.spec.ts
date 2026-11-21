import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 전리품원래대로 } from './helpers/game-state.helper.js';
import { type 로그줄, 미션로그, 설명안되는줄, 임프있게하기, 적치우고레벨맞추기, 준피해, 처치줄 } from './helpers/mission-log.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-GS-001',
  name: '레벨 1 탱커가 장비 없이 혼자 임프 3마리를 잡는 동안 준 피해 · 처치 경험치 · 처치 골드가 기획서 값이다',
  platforms: ['android'],
  precondition: ['탱커 · 레벨 1 · 장비 없음 · 혼자 던전 · 전리품 원래 확률'],
  elements: ['monster:임프', 'skill:전투 망치', 'rate:임프 경험치', 'rate:임프 골드', 'state:레벨=1', 'state:직업=탱커'],
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
  await test.step('탱커로 혼자 던전에 들어가 적을 치우고 레벨 1 · 전리품 원래 확률로 맞춘다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
    await 적치우고레벨맞추기(game, 1);
    await 전리품원래대로(game);
  });
  const 로그 = await gameLog(미션로그(admin));
  await test.step('「전투 망치」로 임프 3마리를 잡는다', async () => {
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
          goal: 3,
          stallMs: 60_000,
        },
      );
    } catch (e) {
      멈춤 = e;
    }
    const 처치 = 처치줄(줄들, 나.아이디, 'Imp');
    const 피해 = await verify.log('「전투 망치」로 준 피해 줄이 전부 10 이다', 준피해(줄들, 나.아이디, '전투 망치').map((줄) => 줄.value), 10);
    const 경험치 = await verify.log('임프 처치 줄 경험치가 전부 12 다', 처치.map((줄) => 줄.exp), 12, { least: 3 });
    const 골드 = await verify.log('임프 처치 줄 골드가 전부 3 ~ 7 이다', 처치.map((줄) => 줄.gold), { min: 3, max: 7 }, { least: 3 });
    await verify('BRM-REQ-374 레벨 1 탱커가 장비 없이 「전투 망치」로 준 피해는 10 이다', 피해, true);
    await verify('BRM-REQ-123 혼자 장비 없이 잡은 임프 처치 경험치는 12 다', 경험치, true);
    await verify('BRM-REQ-127 장비 없이 잡은 임프 처치 골드는 3 ~ 7 이다', 골드, true);
    const 조건 = { 레벨: 1, 직업: '탱커', 무기: '-', 갑옷: '-', 인원: 1 };
    for (const 줄 of 설명안되는줄(줄들, 나.아이디, 조건, ['hit', 'kill', 'item']).slice(0, 10)) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
